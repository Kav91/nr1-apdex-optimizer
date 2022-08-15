import React from 'react';
import PropTypes from 'prop-types';
import { Button, NerdGraphMutation, Toast, ngql, Tooltip } from 'nr1';
import ReactTable, { ReactTableDefaults } from 'react-table';
import 'react-table/react-table.css';
import './styles.scss';

const async = require('async');

const MAX_QUEUE_LIMIT = 3; // apm down stream service can timeout and be unreliable
const DEFAULT_APM_APDEX_T = 0.5;
const DEFAULT_BROWSER_APDEX_T = 7;

// Existing UI Colors
const CRITICAL_COLOR = 'rgb(191, 0, 22)';
// const WARNING_COLOR = 'rgb(191, 150, 0)';
const NORMAL_COLOR = 'rgb(17, 166, 0)';
const LINK_COLOR = 'rgb(0, 121, 191)';

const columnDefaults = {
  ...ReactTableDefaults.column,
  headerClassName: 'wordwrap',
  headerStyle: { textAlign: 'center' }
};

const updateAllApdex = suggestions => {
  return new Promise(resolve => {
    const updateResponses = [];
    const updateQueue = async.queue((suggestion, callback) => {
      const { type, value, guid } = suggestion;

      if (type === 'apm') {
        NerdGraphMutation.mutate({
          mutation: ngql`mutation {
            agentApplicationSettingsUpdate(settings: {apmConfig: {apdexTarget: ${value}}}, guid: "${guid}") {
              guid
              errors {
                description
                errorClass
                field
              }
              apmSettings {
                apmConfig {
                  apdexTarget
                }
              }
            }
          }
          `
        })
          .catch(error => {
            // eslint-disable-next-line
            console.error(error);
          })
          .then(value => {
            updateResponses.push(value);
            callback();
          });
      } else if (type === 'browser') {
        NerdGraphMutation.mutate({
          mutation: ngql`mutation {
          agentApplicationSettingsUpdate(settings: {browserConfig: {apdexTarget: ${value}}}, guid: "${guid}") {
            guid
            errors {
              description
              errorClass
              field
            }
            browserSettings {
              browserConfig {
                apdexTarget
              }
            }
          }
        }`
        })
          .catch(error => {
            // eslint-disable-next-line
            console.error(error);
          })
          .then(value => {
            updateResponses.push(value);
            callback();
          });
      } else {
        // unknown
        callback();
      }
    }, MAX_QUEUE_LIMIT);

    suggestions.forEach(s => {
      if (s.browserSuggestedApdexT) {
        updateQueue.push({
          type: 'browser',
          value: s.browserSuggestedApdexT,
          guid: s.guid
        });
      }

      if (s.apmSuggestedApdexT) {
        updateQueue.push({
          type: 'apm',
          value: s.apmSuggestedApdexT,
          guid: s.guid
        });
      }
    });

    updateQueue.drain(() => {
      // eslint-disable-next-line
      console.log(updateResponses);
      resolve(updateResponses);
    });
  });
};

const updateBrowserApdex = (guid, value) => {
  Toast.showToast({
    title: 'Applying apdex update...',
    type: Toast.TYPE.NORMAL
  });

  NerdGraphMutation.mutate({
    mutation: ngql`mutation {
    agentApplicationSettingsUpdate(settings: {browserConfig: {apdexTarget: ${value}}}, guid: "${guid}") {
      guid
      errors {
        description
        errorClass
        field
      }
      browserSettings {
        browserConfig {
          apdexTarget
        }
      }
    }
  }
  `
  }).then(result => {
    const newValue =
      result?.data?.agentApplicationSettingsUpdate?.browserSettings
        ?.browserConfig?.apdexTarget;

    if (parseFloat(value) === parseFloat(newValue)) {
      Toast.showToast({
        title: 'Successfully updated',
        description: 'Refresh to update table',
        type: Toast.TYPE.NORMAL
      });
    } else {
      Toast.showToast({
        title: 'Failed to update',
        type: Toast.TYPE.CRITICAL
      });
    }
  });
};

const updateApmApdex = (guid, value) => {
  Toast.showToast({
    title: 'Applying apdex update...',
    type: Toast.TYPE.NORMAL
  });

  NerdGraphMutation.mutate({
    mutation: ngql`mutation {
    agentApplicationSettingsUpdate(settings: {apmConfig: {apdexTarget: ${value}}}, guid: "${guid}") {
      guid
      errors {
        description
        errorClass
        field
      }
      apmSettings {
        apmConfig {
          apdexTarget
        }
      }
    }
  }
  `
  }).then(result => {
    const newValue =
      result?.data?.agentApplicationSettingsUpdate?.apmSettings?.apmConfig
        ?.apdexTarget;

    if (parseFloat(value) === parseFloat(newValue)) {
      Toast.showToast({
        title: 'Successfully updated',
        description: 'Refresh to update table',
        type: Toast.TYPE.NORMAL
      });
    } else {
      Toast.showToast({
        title: 'Failed to update',
        type: Toast.TYPE.CRITICAL
      });
    }
  });
};

const columns = [
  {
    Header: 'Application Name',
    accessor: 'name'
  },
  {
    Header: 'APM Transactions',
    accessor: 'apmCount',
    className: 'right'
  },
  {
    Header: 'APM Transaction Errors',
    accessor: 'apmErrorCount',
    className: 'right'
  },
  {
    Header: 'Configured APM ApdexT',
    accessor: 'apmApdexT',
    Cell: cellInfo =>
      cellInfo.original.apmApdexT && (
        <a
          target="_blank"
          rel="noopener noreferrer"
          href={cellInfo.original.apmApdexTHref}
          title="Click to launch APM app settings page in a new tab"
          style={{ color: LINK_COLOR }}
        >
          {cellInfo.original.apmApdexT}
        </a>
      ),
    className: 'right'
  },
  {
    Header: 'APM Apdex Score [t:0.5]',
    accessor: 'apmApdexScore',
    className: 'right'
  },
  {
    Header: 'Suggested APM ApdexT',
    accessor: 'apmSuggestedApdexT',
    Cell: cellInfo => {
      return (
        <span>
          {cellInfo.row.apmSuggestedApdexT}
          {cellInfo.row.apmSuggestedApdexT && (
            <Tooltip text="Note: PHP & C do not support server side configuration">
              <Button
                disabled={
                  cellInfo?.original?.language === 'php' ||
                  cellInfo?.original?.language === 'c' ||
                  parseFloat(cellInfo.original.apmSuggestedApdexT) ===
                    parseFloat(cellInfo.original.apmApdexT)
                }
                style={{ marginLeft: '10px', marginTop: '-5px' }}
                type={Button.TYPE.PRIMARY}
                sizeType={Button.SIZE_TYPE.SMALL}
                onClick={() =>
                  updateApmApdex(
                    cellInfo.original.guid,
                    cellInfo.original.apmSuggestedApdexT
                  )
                }
              >
                Apply
              </Button>
            </Tooltip>
          )}{' '}
        </span>
      );
    },
    getProps: (state, rowInfo) => {
      return {
        style: {
          color:
            rowInfo && rowInfo.row.apmSuggestedApdexT <= DEFAULT_APM_APDEX_T
              ? NORMAL_COLOR
              : CRITICAL_COLOR
        }
      };
    },
    className: 'right'
  },
  {
    Header: 'Browser Page Views',
    accessor: 'browserCount',
    className: 'right'
  },
  {
    Header: 'JavaScript Errors',
    accessor: 'browserErrorCount',
    className: 'right'
  },
  {
    Header: 'Configured Browser ApdexT',
    accessor: 'browserApdexT',
    Cell: cellInfo =>
      cellInfo.original.browserApdexT && (
        <a
          target="_blank"
          rel="noopener noreferrer"
          href={cellInfo.original.browserApdexTHref}
          title="Click to launch Browser app settings page in a new tab"
          style={{ color: LINK_COLOR }}
        >
          {cellInfo.original.browserApdexT}
        </a>
      ),
    className: 'right'
  },
  {
    Header: 'Browser Apdex Score [t:7.0]',
    accessor: 'browserApdexScore',
    className: 'right'
  },
  {
    Header: 'Suggested Browser ApdexT',
    accessor: 'browserSuggestedApdexT',
    Cell: cellInfo => {
      return (
        <span>
          {cellInfo.row.browserSuggestedApdexT}
          {cellInfo.row.browserSuggestedApdexT && (
            <Button
              disabled={
                parseFloat(cellInfo.original.browserSuggestedApdexT) ===
                parseFloat(cellInfo.original.browserApdexT)
              }
              style={{ marginLeft: '10px', marginTop: '-5px' }}
              type={Button.TYPE.PRIMARY}
              sizeType={Button.SIZE_TYPE.SMALL}
              onClick={() =>
                updateBrowserApdex(
                  cellInfo.original.guid,
                  cellInfo.original.browserSuggestedApdexT
                )
              }
            >
              Apply
            </Button>
          )}{' '}
        </span>
      );
    },
    getProps: (state, rowInfo) => {
      return {
        style: {
          color:
            rowInfo &&
            rowInfo.row.browserSuggestedApdexT <= DEFAULT_BROWSER_APDEX_T
              ? NORMAL_COLOR
              : CRITICAL_COLOR
        }
      };
    },
    className: 'right'
  }
];

export default class ApdexTable extends React.Component {
  static propTypes = {
    data: PropTypes.array.isRequired,
    isLoading: PropTypes.bool.isRequired
  };

  constructor() {
    super();
    this.state = {
      search: '',
      updatingAll: false
    };
  }

  render() {
    let data = this.props.data;
    if (this.state.search) {
      data = data.filter(row => {
        return (
          row.name.includes(this.state.search) ||
          String(row.age).includes(this.state.search) ||
          String(row.apmApdexT).includes(this.state.search) ||
          String(row.browserApdexT).includes(this.state.search) ||
          String(row.apmApdexScore).includes(this.state.search) ||
          String(row.browserApdexScore).includes(this.state.search)
        );
      });
    }

    // php and c do not support server side config
    const apdexSuggestions = (data || []).filter(
      d =>
        (d.browserSuggestedApdexT &&
          parseFloat(d.browserSuggestedApdexT) > 0 &&
          parseFloat(d.browserSuggestedApdexT) !==
            parseFloat(d.browserApdexT)) ||
        (d.apmSuggestedApdexT &&
          parseFloat(d.apmSuggestedApdexT) > 0 &&
          d.language !== 'php' &&
          d.language !== 'c' &&
          parseFloat(d.apmSuggestedApdexT) !== parseFloat(d.apmApdexT))
    );

    return (
      <div>
        Search:{' '}
        <input
          value={this.state.search}
          onChange={e => this.setState({ search: e.target.value })}
          style={{ border: '1px solid gray', width: '20%' }}
        />
        <div style={{ float: 'right' }}>
          <Tooltip text="Note: PHP & C do not support server side configuration">
            <Button
              loading={this.state.updatingAll}
              disabled={apdexSuggestions.length === 0}
              onClick={() => {
                this.setState({ updatingAll: true }, async () => {
                  await updateAllApdex(apdexSuggestions);
                  this.setState({ updatingAll: false });
                });
              }}
            >
              Apply All Suggestions ({apdexSuggestions.length})
            </Button>
          </Tooltip>
        </div>
        <p>&nbsp;</p>
        <ReactTable
          data={data}
          column={columnDefaults}
          columns={columns}
          className="-striped -highlight"
          minRows={1}
          defaultPageSize={10}
          pageSizeOptions={[10, 25, 50, 100]}
          loading={this.props.isLoading}
        />
      </div>
    );
  }
}
