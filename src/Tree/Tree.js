'use strict';

// 为了提高效率，直接操作了tree.state.data，
// 由于tree.state.data是一个array，当data值改变时，不经过setState，
// 所有的Item的data也因此改变，可能破坏了react的一个原则

import React, { Component, PropTypes } from 'react';
import { findDOMNode } from 'react-dom';
import classnames from 'classnames';
import { toArray, substitute } from '../utils/strings';
import { forEach, deepEqual, hashcode } from '../utils/objects';
import { fetchEnhance, FETCH_SUCCESS } from '../higherOrders/Fetch';
import { register } from '../higherOrders/FormItem';
import { removeClass } from '../utils/dom';
import { compose } from '../utils/compose';
import { getLang } from '../lang';

import TreeStyles from '../styles/_tree.scss';

import Item from './Item';

let defaultIcons = [];

class Tree extends Component {
  constructor (props) {
    super(props);

    this.state = {
      data: [],
      value: this.formatValue(props.value)
    };

    this.handleClick = this.handleClick.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }
  
  componentWillMount () {
    this.formatData(this.props.data);
  }

  componentWillReceiveProps (nextProps) {
    if (!deepEqual(nextProps.value, this.props.value)) {
      this.setValue(nextProps.value);
    }
    if (!deepEqual(nextProps.data, this.props.data)) {
      this.formatData(nextProps.data, this.formatValue(nextProps.value));
    }
    if (nextProps.sep !== this.props.sep ||
        nextProps.greedy !== this.props.greedy) {
      this.handleChange();
    }
  }

  componentWillUpdate (nextProps, nextState) {
    // initValue 和 initData 分开处理
    if (!deepEqual(nextState.value, this.state.value)) {
      this.init(nextState.data, nextState.value);
    }
  }

  formatValue (value) {
    return toArray(value, this.props.sep);
  }

  getValue (sep) {
    let list = [],
        values = [],
        greedy = this.props.greedy;
    forEach(this.refs, function (ref) {
      ref.getChecked(list, greedy);
    });

    list.forEach(function (d) {
      values.push(d.$value);
    });

    if (sep === undefined) {
      sep = this.props.sep;
    }
    if (sep) {
      values = values.join(this.props.sep);
    }
    return values;
  }

  setValue (value) {
    value = this.formatValue(value);
    this.setState({ value });
  }

  formatData (data) {
    let tt = this.props.textTpl;
    let vt = this.props.valueTpl;
    let setTpl = function (arr) {
      arr.forEach((d) => {
        d.$text = substitute(tt, d);
        d.$value = substitute(vt, d);
        d.$key = d.id || d.key || hashcode(`${d.$value}-${d.$text}`);
        if (d.children) {
          setTpl(d.children);
        }
      });
    };
    setTpl(data);
    this.init(data, this.state.value);
  }

  initValue (value) {
    this.init(this.state.data, value);
  }

  // 初始化数据，不在item里面判断，在元数据里加入deep和status，减少判断次数
  init (data, values) {
    if (data.length === 0) {
      return;
    }
    let getStatus = function (d, last, deep) {
      let val = d.$value,
          status,
          newDeep,
          nextDeep;
      if (deep === undefined) {
        newDeep = [];
        nextDeep = [last ? 0 : 1];
      } else {
        newDeep = deep.slice();
        if (!d.children || d.children.length === 0) {
          newDeep.push(last ? 2 : 1);
        }
        nextDeep = deep.slice();
        nextDeep.push(last ? 0 : 1);
      }
      if (d.children && d.children.length > 0) {
        let count = d.children.length;
        d.children.forEach((sub, i) => {
          let subStatus = getStatus(sub, i === (count - 1), nextDeep);
          if (status === undefined) {
            status = subStatus;
          } else if (status !== subStatus) {
            status = 1;
          }
        });
      } else {
        status = values.indexOf(val) >= 0 ? 2 : 0;
      }
      d.$status = status;
      d.$deep = newDeep;
      return status;
    };
    for (let i = 0, count = data.length; i < count; i++) {
      getStatus(data[i], i === (count - 1));
    }
    this.setState({ data });
  }

  isInitialed () {
    let data = this.state.data;
    if (data.length === 0) {
      return true;
    }
    return !!data[0].$deep;
  }

  toggleAll (open) {
    forEach(this.refs, function (ref) {
      ref.toggleAll(open);
    });
  }

  handleChange () {
    if (this.props.onChange) {
      setTimeout(() => {
        let value = this.getValue();
        this.props.onChange(value);
      });
    }
  }

  handleClick (item) {
    let active = TreeStyles.active;
    removeClass([].slice.call(findDOMNode(this).querySelectorAll('.' + active)), active);
    if (this.props.onClick) {
      this.props.onClick(item);
    }
  }

  render () {
    const { selectAble, className, readOnly, open, icons } = this.props;

    const { value, data } = this.state;

    let items = data.map(function (item, i) {
      return (
        <Item ref={i}
          icons={icons || defaultIcons}
          open={open}
          readOnly={readOnly}
          onClick={this.handleClick}
          onStatusChange={this.handleChange}
          value={value}
          selectAble={selectAble}
          key={item.$key}
          data={item}
        />
      );
    }, this);

    let rootClassName = classnames(
      className,
      TreeStyles.tree,
      readOnly && TreeStyles.readonly
    );

    return (
      <ul className={rootClassName}>{items}</ul>
    );
  }
}

Tree.propTypes = {
  className: PropTypes.string,
  data: PropTypes.array,
  greedy: PropTypes.bool,
  icons: PropTypes.array,
  onChange: PropTypes.func,
  onClick: PropTypes.func,
  open: PropTypes.bool,
  readOnly: PropTypes.bool,
  selectAble: PropTypes.bool,
  sep: PropTypes.string,
  src: PropTypes.string,
  textTpl: PropTypes.string,
  value: PropTypes.any,
  valueTpl: PropTypes.string
};

Tree.defaultProps = {
  sep: ',',
  data: [],
  textTpl: '{text}',
  valueTpl: '{id}'
};

module.exports = compose(
  register('tree', { valueType: 'array' }),
  fetchEnhance
)(Tree);

module.exports.setDefaultIcons = function (icons) {
  defaultIcons = icons;
};
