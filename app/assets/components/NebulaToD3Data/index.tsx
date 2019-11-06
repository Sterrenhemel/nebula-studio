import * as d3 from 'd3';
import * as React from 'react';

import './index.less';

interface INode extends d3.SimulationNodeDatum {
  name: string;
  group: number;
}

interface ILink extends d3.SimulationLinkDatum<INode> {
  value: number;
}

interface IProps {
  width: number;
  height: number;
  data: {
    nodes: INode[];
    links: ILink[];
  };
}

interface IRefs {
  mountPoint?: HTMLDivElement | null;
}

class NebulaToD3Data extends React.Component<IProps, {}> {
  ctrls: IRefs = {};

  componentDidMount() {
    if (!this.ctrls.mountPoint) {
      return;
    }
    const { width, height, data } = this.props;
    const force = d3
      .forceSimulation()
      .nodes(data.nodes)
      .force('charge', d3.forceManyBody().strength(-120))
      .force('link', d3.forceLink(data.links).distance(50))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const svg = d3
      .select(this.ctrls.mountPoint)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const link = svg
      .selectAll('line')
      .data(data.links)
      .enter()
      .append('line')
      .style('stroke', '#999999')
      .attr('stroke-width', 2);

    function dragStarted(d) {
      d.fx = d.x;
      d.fy = d.y;

      return d;
    }

    function dragged(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }

    function dragEnded(d) {
      d.fx = null;
      d.fy = null;
    }

    const color = d3.scaleOrdinal(d3.schemeCategory10);
    const node = svg
      .selectAll('circle')
      .data<INode>(data.nodes)
      .enter()
      .append<SVGCircleElement>('circle')
      .attr('r', 20)
      .style('stroke', '#FFFFFF')
      .style('stroke-width', 2.5)
      .style('cursor', 'pointer')
      .style('fill', (d: any) => color(d.group))
      .on('click', (d: any) => {
        console.log(d);
      })
      .call(d3
        .drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded) as any);

    const label = svg
      .append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data<INode>(data.nodes)
      .enter()
      .append('text')
      .text((d: INode) => {
        return d.name;
      })
      .on('click', (d: INode) => {
        console.log(d);
      })
      .style('font-size', '12px')
      .style('cursor', 'pointer')
      .style('fill', '#fff')
      .call(d3
        .drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded) as any);

    force.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);

      label
        .attr('x', (d: any) => {
          return d.x - 12;
        })
        .attr('y', (d: any) => {
          return d.y + 5;
        });
    });
  }

  render() {
    return (
      <div
        className="output-graph"
        ref={mountPoint => (this.ctrls.mountPoint = mountPoint)}
      />
    );
  }
}

export default NebulaToD3Data;
