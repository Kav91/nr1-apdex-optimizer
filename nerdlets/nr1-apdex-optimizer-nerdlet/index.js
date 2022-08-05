import React, { useContext, useEffect, useState } from 'react';
import {
  nerdlet,
  BlockText,
  HeadingText,
  PlatformStateContext,
  Stack,
  StackItem
} from 'nr1';
import AccountListSelect from './AccountListSelect';
import ApdexTableContainer from './ApdexTableContainer';

// https://docs.newrelic.com/docs/new-relic-programmable-platform-introduction

const LINK_COLOR = 'rgb(0, 121, 191)';

function OptimizerRoot() {
  const [accountId, setAccountId] = useState(null);
  const platformState = useContext(PlatformStateContext);

  useEffect(() => {
    nerdlet.setConfig({
      timePicker: false
    });
  }, []);

  return (
    <div>
      <Stack
        directionType={Stack.DIRECTION_TYPE.VERTICAL}
        horizontalType={Stack.HORIZONTAL_TYPE.FILL}
        style={{ paddingLeft: 20, paddingRight: 20, width: '97%' }}
      >
        <StackItem>
          <AccountListSelect
            onAccountChange={accountId => setAccountId(accountId)}
          />
        </StackItem>
        <StackItem>
          {accountId ? (
            <ApdexTableContainer
              accountId={accountId}
              platformState={platformState}
            />
          ) : (
            <BlockText>&nbsp;</BlockText>
          )}
        </StackItem>
        <StackItem>
          <HeadingText style={{ marginBottom: 8 }}>
            What should I set T to?
          </HeadingText>
          <BlockText type="paragraph" style={{ marginBottom: 8 }}>
            If you have an app that has been running for awhile in a steady
            state and you feel you have a good baseline for acceptable
            performance, you can start by setting your Apdex threshold to give
            you a baseline Apdex score of 0.95. So you’ll want to get the 90th
            percentile value and set that to Apdex T.
          </BlockText>
          <BlockText type="paragraph" style={{ marginBottom: 8 }}>
            The suggested thresholds above are based on the 90th percentile. It
            is recommended that the time picker is set to 7 days.
          </BlockText>
          <BlockText type="paragraph" style={{ marginBottom: 8 }}>
            Based on a mathematical{' '}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://blog.newrelic.com/product-news/how-to-choose-apdex-t/"
              style={{ color: LINK_COLOR }}
            >
              analysis
            </a>
            .
          </BlockText>
        </StackItem>
      </Stack>
    </div>
  );
}

export default OptimizerRoot;
