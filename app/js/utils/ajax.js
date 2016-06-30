// use this instead of $.ajax
// performs some utility functions too
app.utils.ajax = function (method, url, params) {
  params = params === undefined ? {} : params;
  params.method = method;
  params.url = url;

  NProgress.start();
  app.utils.internet();

  return $.ajax(params).always(function (argOne, status, argThree) {

     NProgress.done();

    if (status === 'success') {
      var data = argOne;
      var xhr = argThree;
      var err = undefined;
    } else if (status === 'error') {
      var data = undefined;
      var xhr = argOne;
      var err = argThree;
    }

    // handle behavior for changing nav automatically
    if (method === 'GET' && data && data.nav && typeof(data.nav) === 'string') {
      $('#nav').html(data.nav);
    }

    if (method === 'GET' && data && data.panel && typeof(data.panel) === 'string') {
      $('#panel').html(data.panel)
    }
  });
};

// adding utility methods to app.utils.ajax
['GET', 'PUT', 'POST', 'DELETE'].forEach(function (method) {
  app.utils.ajax[method.toLowerCase()] = function (url, params) {
    return app.utils.ajax(method, url, params);
  };
});
