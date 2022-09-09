import { makeAutoObservable, observable } from 'mobx';
import service from '@app/config/service';
import { v4 as uuidv4 } from 'uuid';

// split from semicolon out of quotation marks
const SEMICOLON_REG = /((?:[^;'"]*(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*')[^;'"]*)+)|;(?!\\)(?=\n)/;
const SEMICOLON_WITH_LINE_REG = /((?:[^;'"]*(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*')[^;'"]*)+)|;\\\n/g;
/*
Explain:
Keep the execution logic consistent with the nebula console

Example1: send multi sentences in one line, split by semicolon with backslashes, get error
Format: sentence1;\ sentence2;\ sentence3;
Result: error

Example2: A sentence on a single line, ending with a semicolon, without adding a backslash, sent separately, and returning the result of each statement
Format: 
  sentence1;
  sentence2;
  sentence3;
Result: [sentence1 result; sentence2 result; sentence3 result];

Example3: send multi sentences in one line, split by semicolon without backslashes, get result of last sentence
Format: sentence1; sentence2; sentence3;
Result: sentence3 result;

Example4: 
Format: Multiple statements ending with a semicolon and a backslash and wrapping to a new line are sent as one statement, returning the last result
sentence1;\
sentence2;\
sentence3;
Result: sentence3 result;
*/
export const splitQuery = (query: string) => {
  const queryList = query.split(SEMICOLON_REG).filter(Boolean);
  const paramList: string[] = [];
  const gqlList: string[] = [];
  queryList.forEach(query => {
    let _query = query.trim();
    if (_query.startsWith(':')) {
      paramList.push(_query);
    } else {
      _query = _query.replaceAll(SEMICOLON_WITH_LINE_REG, ';');
      gqlList.push(_query);
    }
  });
  return {
    paramList,
    gqlList
  };
};

export class ConsoleStore {
  runGQLLoading = false;
  currentGQL = 'SHOW SPACES;';
  results = [] as any;
  paramsMap = null as any;
  favorites = JSON.parse(localStorage.getItem('favorites') || '{}') ;
  constructor() {
    makeAutoObservable(this, {
      results: observable.ref,
      paramsMap: observable,
      currentGQL: observable,
      favorites: observable,
    });
  }

  resetModel = () => {
    this.update({
      currentGQL: 'SHOW SPACES;',
      results: [],
      paramsMap: null
    });
  }

  updateFavorites = (value) => {
    localStorage.setItem('favorites', JSON.stringify(value));
    this.favorites = value;
  }

  update = (param: Partial<ConsoleStore>) => {
    Object.keys(param).forEach(key => (this[key] = param[key]));
  };

  runGQL = async (gql: string, editorValue?: string) => {
    this.update({ runGQLLoading: true });
    try {
      const { gqlList, paramList } = splitQuery(gql);
      const _results = await service.batchExecNGQL(
        {
          gqls: gqlList.filter(item => item !== ''),
          paramList,
        },
        {
          trackEventConfig: {
            category: 'console',
            action: 'run_gql',
          },
        },
      );
      _results.data.forEach(item => item.id = uuidv4());
      const updateQuerys = paramList.filter(item => {
        const reg = /^\s*:params/gim;
        return !reg.test(item);
      });
      if (updateQuerys.length > 0) {
        await this.getParams();
      }
      this.update({
        results: [..._results.data, ...this.results],
        currentGQL: editorValue || gql,
      });
    } finally {
      window.setTimeout(() => this.update({ runGQLLoading: false }), 300);
    }
  };

  getParams = async () => {
    const results = (await service.execNGQL(
      {
        gql: '',
        paramList: [':params'],
      },
    )) as any;
    this.update({
      paramsMap: results.data?.localParams || {},
    });
  }
}

const consoleStore = new ConsoleStore();

export default consoleStore;
