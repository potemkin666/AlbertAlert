(function () {
  var canonicalTarget = location.pathname.toLowerCase().includes('/brialert')
    ? '/Brialert/index.html'
    : '/index.html';
  var query = location.search || '';
  var hash = location.hash || '';
  if (location.pathname.toLowerCase() !== canonicalTarget.toLowerCase()) {
    location.replace(canonicalTarget + query + hash);
  }
})();
