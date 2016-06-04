app.components.site = function($site) {

var $downloadResume = app.$body.find('.download-resume');

function displayData(data) {

  app.utils.ajax.get('views/main.html').then(function(tmpl){

    var compiled_html = _.template(tmpl)({
      resume: data
    });
    // appent to body
    $('body').prepend(compiled_html);
  });
}

(function() {

  app.utils.ajax.get('data/resume.json').then(function(data){
    displayData(data);
  });

  $downloadResume.find('span').html('download Resume');
  $downloadResume.on('click', function (ev) {
  ev.preventDefault();
  
  window.print();

  });

})();

}; // end of script
