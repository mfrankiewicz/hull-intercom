// @flow
export default function getLeadsIdent(ctx: Object, lead: Object): Object {
  const ident = {};

  ident.anonymous_id = `intercom:${lead.id}`;
  if (lead.email) {
    ident.email = lead.email;
  }
  return ident;
}
