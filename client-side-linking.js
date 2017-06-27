// a snippet to add to the website to do visitor linking
var check = 0;
function getAnonymousId() {
  if (window.Intercom && window.Intercom('getVisitorId')) {
    return window.Intercom('getVisitorId');
  }
}
function waitForAnonymousId(cb) {
  check += 1;
  if (check < 20 && !getAnonymousId()) {
    return setTimeout(waitForAnonymousId, 100);
  }
  if (getAnonymousId()) {
    cb(getAnonymousId());
  }
}

Hull.ready(function() {
  waitForAnonymousId(function(anonymousId) {
    Hull.api({ path: "/me/alias" }, "post", { anonymous_id: 'intercom:' + anonymousId });
  });
});
