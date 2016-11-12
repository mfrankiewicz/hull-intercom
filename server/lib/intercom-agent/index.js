/**
 * Superset of Intercom API
 */
export default class IntercomAgent {

    constructor(deps) {
    }

    /**
     *
     */
    userAdded(user) {
      return !_.isEmpty(user["traits_mailchimp/unique_email_id"]);
    }

    /**
     *
     */
    userWithError(user) {
      return !_.isEmpty(user["traits_mailchimp/import_error"]);
    }

}
