app.components.site = function($site) {
  console.log('site');

  // sample data

var resumeData = {

  "work": [
  {
  "company": "frankly.me",
  "endDate": "2015-05-30",
  "summery": "web intern",
  "website": "http://frankly.me",
  "position": "Intern",
  "startDate": "2015-02-19",
  "highlights": "widgets, html, bootstrap, angular, jquery"
  },
  {
  "company": "frankly.me",
  "endDate": "2015-09-30",
  "summery": "nodejs, expressjs",
  "website": "http://frankly.me",
  "position": "web developer",
  "startDate": "2015-07-01",
  "highlights": "site, widgets, hiring panel, admin panel"
  },
  {
  "company": "flatabout",
  "startDate": "2015-10-01",
  "endDate": "2015-11-30",
  "summery": "Frontend",
  "website": "http://flatabout.com",
  "position": "full stack developer",
  "highlights": "html, sass, jquery, nodejs, psql"
  }
  ],
  "awards": [
  {
  "date": "2013-03-22",
  "title": "representation",
  "awarder": "SCRIET Cultural Society"
  }
  ],
  "basics": {
  "dob": "1993-09-15",
  "name": "Satyam Yadav",
  "email": "satyamyadav3@gmail.com",
  "label": "Web Developer",
  "mobile": "7376867678",
  "summery": "I aspire to work in an environment demanding technical, programming , communication and functional expertise for facing and overcoming everyday challenges which require me to be up to date with the technology and continuously strive for enhancing my skills.",
  "location": {
  "pin": "110096",
  "city": "Delhi",
  "address": "Ashoknagar"
  },
  "profiles": [
  {
  "network": "facebook",
  "username": "satyam.py"
  },
  {
  "network": "github",
  "username": "satyamyadav"
  }
  ]
  },
  "skills": [
  {
  "name": "Frontend",
  "keywords": "html,css,javascript"
  },
  {
  "name": "Backend",
  "keywords": "Nodejs, python"
  }
  ],
  "hobbies": "drawing, music",
  "education": [
  {
  "gpa": "70",
  "field": "Bachelor (Computer Science)",
  "endDate": "2016-05-31",
  "startDate": "2012-07-22",
  "university": "C.C.S. University, Meerut",
  "institution": "SCRIET"
  },
  {
  "gpa": "62%",
  "field": "Intermidate",
  "endDate": "2010-03-30",
  "startDate": "2009-03-30",
  "university": "CBSE",
  "institution": "Gyankunj Academy"
  },
  {
  "gpa": "78%",
  "field": "High School",
  "endDate": "2008-03-05",
  "startDate": "2005-03-05",
  "university": "CBSE",
  "institution": "St. Xavier's School Ballia"
  }
  ],
  "references": [
  {
  "name": "me",
  "reference": "enthusiastic"
  }
  ],
  projects: [
    {
      title: "project title",
      summery: "project summery",
      images: ['img/projects/len-den-1.jpg']
    },
    {
      title: "project title",
      summery: "project summery",
      images: ['img/projects/len-den-1.jpg']
    },
    {
      title: "project title",
      summery: "project summery",
      images: ['img/projects/len-den-1.jpg']
    },

  ]
}




function displayData(data) {
  // load template text
  //var template = $('#template').html();
  // complie template and bind context

  app.utils.ajax.get('/views/main.html').then(function(tmpl){
    //console.log(tmpl);
    var el = document.createElement('div');
    el.innerHTML = tmpl;
    var template = $(el).find('#template').html();
    console.log(template);

  var compiled_html = _.template(tmpl)({
    resume: data
  });
  // appent to body
  $('body').append(compiled_html);
  });
}


  //render('main', resumeData);
(function() {
  displayData(resumeData);

  var $downloadResume = app.$body.find('.download-resume');

    $downloadResume.on('click', function (ev) {
    ev.preventDefault();
    console.log('click');
    window.print();
    $resume.printThis({
        debug: false,               
        importCSS: true,            
        importStyle: true,         
        printContainer: false,       
        loadCSS: 'https://scrietossdg.herokuapp.com/css/site.css',  
        removeInline: false,      
        printDelay: 333,          
        formValues: false          
    });


    });

})();



}; // end of script
