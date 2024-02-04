import {
  PlaidLinkError,
  PlaidLinkOnEventMetadata,
  PlaidLinkOnExitMetadata,
  PlaidLinkOnSuccessMetadata,
  PlaidLinkStableEvent,
} from 'react-plaid-link';

export const logEvent = (
  eventName: PlaidLinkStableEvent | string,
  metadata:
    | PlaidLinkOnEventMetadata
    | PlaidLinkOnSuccessMetadata
    | PlaidLinkOnExitMetadata,
  error?: PlaidLinkError | null,
) => {
  console.log(`Link Event: ${eventName}`, metadata, error);
};

export const logSuccess = async ({
  institution,
  accounts,
  link_session_id,
}: PlaidLinkOnSuccessMetadata) => {
  logEvent('onSuccess', {
    institution,
    accounts,
    link_session_id,
  });
};
