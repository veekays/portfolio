app.components.settingsBtn = function($btn) {

	$btn.on('click', function(ev){
		ev.preventDefault();
		console.log('settings btn clicked');
    
    var data = JSON.parse(window.localStorage.getItem('resumeData'));

    displayData(data, 'modals/resumeModal', $('#resumeModal'));
    app.utils.loadModal('#resumeModal');
	})


	function displayData(data, template, $target) {
	  var templateUrl = 'public/views/' + template + '.html';
	  app.utils.ajax.get(templateUrl).then(function(tmpl){

	    var compiled_html = _.template(tmpl)({
	      data: data
	    });

	    // appent to body
	    $target.html(compiled_html);
	    // $target.find('img').each(function () {
	    //   var $this = $(this);
	    //   app.utils.loadImg($this);
	    // });
	  });
	}


}