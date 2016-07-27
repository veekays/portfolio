app.components.resumeModal = function($modal) {

	var $updateResume = $modal.find('.update-resume');
	var $resetResume = $modal.find('.reset-resume');
  var $resumeDataDiv = $modal.find('#resume-data');

	$updateResume.on('click', function(ev){
		ev.preventDefault();

		var data = $resumeDataDiv.val();
    localStorage.setItem('resumeData', data);

    location.reload();

	})

	$resetResume.on('click', function(ev){
		ev.preventDefault();

		//console.log('reset resume btn clicked');

		localStorage.clear();
    location.reload();

		// app.utils.ajax.get('public/data/resume.json').then(function(data){

		//   $resumeDataDiv.html(JSON.stringify(data, undefined, 2));

		// });

	})

}
