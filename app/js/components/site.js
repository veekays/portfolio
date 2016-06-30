app.components.site = function($site) {

var $downloadResume = app.$body.find('.download-resume');

function displayData(data) {

  app.utils.ajax.get('public/views/main.html').then(function(tmpl){

    var compiled_html = _.template(tmpl)({
      resume: data
    });
    // appent to body
    //$('body').prepend(compiled_html);
    $('#main-app').html(compiled_html)
  });
}

(function() {


  if(typeof(Storage) !== "undefined") {
    var resumeData = {};
          // Code for localStorage/sessionStorage.
    if (localStorage.resumeData) {
      console.log('mila')
      resumeData = JSON.parse(window.localStorage.getItem('resumeData'));
      displayData(resumeData);
    } else {
      console.log('nahi mila')
      app.utils.ajax.get('public/data/resume.json').then(function(data){
        localStorage.setItem('resumeData', JSON.stringify(data));
        displayData(data);
      });
    }
  } else {
      // Sorry! No Web Storage support..
  }


  $downloadResume.find('span').html('download Resume');
  $downloadResume.on('click', function (ev) {
  ev.preventDefault();
  
  window.print();

  });

})();

}; // end of script
