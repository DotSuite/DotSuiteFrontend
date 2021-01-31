import React, { useEffect } from 'react';
import DashboardInsider from 'components/Dashboard/DashboardInsider';

import HomepageContent from './HomepageContent';
import withDashboardActions from 'containers/Dashboard/withDashboardActions';
import withSettings from 'containers/Settings/withSettings';
import { compose } from 'utils';

function DashboardHomepage({ changePageTitle, name }) {
  useEffect(() => {
    changePageTitle(name);
  }, [name, changePageTitle]);

  return (
    <DashboardInsider name="homepage">
      <HomepageContent />
    </DashboardInsider>
  );
}

export default compose(
  withDashboardActions,
  withSettings(({ organizationSettings }) => ({
    name: organizationSettings.name,
  })),
)(DashboardHomepage);
