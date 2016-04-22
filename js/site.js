'use strict';


// defining 
window.app = window.app === undefined ? {} : window.app;

// setting up commonly used vars
app.vent = $({});
app.$document = $(document);
app.$window = $(window);
app.$body = $('body');
app.pagename = $('#panel').data('page-name');
//app.currentLocation = {full_address: '', country: '', lat: '', lng: ''};
//app.searchedLocation = {full_address: '', country: '', lat: '', lng: ''};


/*setting location 
*/
/*  var geocoder;
  
  var options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
  };

  function success(pos) {
    var crd = pos.coords;
    var lat = crd.latitude;
    var lng = crd.longitude;
    codeLatLng(lat, lng);
    app.currentLocation.lat = lat;
    app.currentLocation.lng = lng;

  };

  function error(err) {
  };

  navigator.geolocation.getCurrentPosition(success, error, options);

  function initialize() {
     geocoder = new google.maps.Geocoder();
   }

  function codeLatLng(lat, lng) {

    var latlng = new google.maps.LatLng(lat, lng);
    geocoder.geocode({'latLng': latlng}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        if (results[1]) {
         //find country name
          for (var i=0; i<results[0].address_components.length; i++) {
            for (var b=0;b<results[0].address_components[i].types.length;b++) {

             //there are different types that might hold a city admin_area_lvl_1 usually does in come cases looking for sublocality type will be more appropriate
              if (results[0].address_components[i].types[b] == "political") {
                 //this is the object you are looking for
                city= results[0].address_components[i];
                break;
              }
            }
          }
         //city data
          app.currentLocation.country = city.long_name;
          app.currentLocation.full_address = results[1].formatted_address; 

        } else {
          console.log('no results for location');
        }
      } else {
        console.log("Geocoder failed due to: " + status);
      }
    });
  }

   initialize();

*/




// ovverriding navigator for cross browser stuff
navigator.getUserMedia = navigator.getUserMedia ||
                        navigator.webkitGetUserMedia ||
                        navigator.mozGetUserMedia ||
                        navigator.msGetUserMedia;

// defining BEHAVIORS - methods in browser/behaviors
app.behaviors = app.behaviors === undefined ? {} :  app.behaviors;

// defining COMPONENTS - methods in browser/components
app.components = app.components === undefined ? {} : app.components;

// defining UTILITIES - methods in browser/utils
app.utils = app.utils === undefined ? {} : app.utils;

// app in memory cache
app.cache = {};

app.requestArgs = {};

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

    // handle authentication modal
    if (xhr.status === 401) {

      if (url === '/modal/review') {
        params.modalId = "#reviewModal";
      }
      app.utils.requestSerializer(method, url, params);
      app.utils.loadModal('#authModal', '/modal/auth');
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

// get current page url
app.utils.currentUrl = function (withSearch) {
    var urlParts = [location.protocol, '//', location.host, location.pathname];
    if (withSearch === true) {
        return urlParts.concat([location.search]).join('');
    } else {
        return urlParts.join('');
    }
};

// get website domain
app.utils.domain = function () {
    return [location.protocol, '//', location.host].join('');
};

app.utils.site = function (path) {
    return [location.protocol, '//', location.host, '/', path].join('');
};

app.utils.runningVideos = [];

app.utils.preloaderHtml = function () {
  return (
    '<div class="row text-center">'+
      '<div class="div col-sm-12">'+
        '<div class="preloader-wrapper small active">'+
              '<div class="spinner-layer spinner-blue">'+
                '<div class="circle-clipper left">'+
                  '<div class="circle"></div>'+
                '</div>'+
                '<div class="gap-patch">'+
                  '<div class="circle"></div>'+
                '</div>'+
                '<div class="circle-clipper right">'+
                  '<div class="circle"></div>'+
                '</div>'+
              '</div>'+

              '<div class="spinner-layer spinner-red">'+
                '<div class="circle-clipper left">'+
                  '<div class="circle"></div>'+
                '</div>'+
                '<div class="gap-patch">'+
                  '<div class="circle"></div>'+
               ' </div>'+
                '<div class="circle-clipper right">'+
                  '<div class="circle"></div>'+
                '</div>'+
              '</div>'+

              '<div class="spinner-layer spinner-yellow">'+
                '<div class="circle-clipper left">'+
                  '<div class="circle"></div>'+
                '</div>'+
                '<div class="gap-patch">'+
                  '<div class="circle"></div>'+
                '</div>'+
                '<div class="circle-clipper right">'+
                  '<div class="circle"></div>'+
                '</div>'+
              '</div>'+

              '<div class="spinner-layer spinner-green">'+
                '<div class="circle-clipper left">'+
                  '<div class="circle"></div>'+
                '</div>'+
                '<div class="gap-patch">'+
                  '<div class="circle"></div>'+
                '</div>'+
                '<div class="circle-clipper right">'+
                  '<div class="circle"></div>'+
                '</div>'+
              '</div>'+
            '</div>'+
    '</div>'
  );
};

// setting up commonly used functions
app.utils.$elInViewport = function ($el) {
    var el = $el.get(0);

    var top = el.offsetTop;
    var left = el.offsetLeft;
    var width = el.offsetWidth;
    var height = el.offsetHeight;
    while (el.offsetParent) {
        el = el.offsetParent;
        top += el.offsetTop;
        left += el.offsetLeft;
    }
    //console.log('top'+top+'left'+left+'width'+width+'height'+height);
    //console.log('wtop'+window.pageYOffset+'wleft'+window.pageXOffset+'Wwidth'+window.innerWidth+'wheight'+window.innerHeight);
    return (
        top >= window.pageYOffset &&
        left >= window.pageXOffset &&
        (top + height) <= (window.pageYOffset + window.innerHeight) &&
        (left + width) <= (window.pageXOffset + window.innerWidth)
    );
};

// check if $el was removed
app.utils.$elRemoved = function (domNodeRemovedEvent, $el) {
    var $evTarget = $(domNodeRemovedEvent.target);

    return $evTarget.get(0) === $el.get(0) || $.contains($evTarget.get(0), $el.get(0));
};

app.utils.loadingBtn = function (id, d) {
    var ID = $('#' + id);
    var org = ID.text();
    var orgVal = ID.val();
    ID.val("Processing...");
    ID.text("Processing...");
    ID.addClass('loading disabled');
    //var ref=this;
    if (d != 0) {
        setTimeout(function () {
            ID.removeClass('loading disabled');
            ID.text(org);
            //ID.val(orgVal);
        }, d * 1000);
    }
};

app.utils.loadingBtnStop = function (id, value, result) {
    var org = value;
    var ID = $('#' + id);
    ID.removeClass('loading').val(org);
    if (result == 'success') {
        app.utils.notify('Your question was asked successfully', 'success', 2);
    } else {
        app.utils.notify('{{error code}} Error message from server', 'error', 2);
    }
};

app.utils.notify = function (text, type, duration) {

    $('#alert-box').fadeIn().html('<div class="text-center alert alert-' + type +'">' + text + ' <a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a></div>').css({
      'z-index': 1040,
      position: 'fixed',
      top: 50 + 'px',
      width: 100 + '%'});

    //Types are: danger, success, warning, info  (default classes of bootstrap)
    if (duration != 0) {
        setTimeout(function () {
            $('#alert-box').fadeOut().html('loading <a href="#" class="close">&times;</a>');
        }, duration * 1000);
    }
    /*$(document).on('close.alert', function (event) {
        $('#alert-hook').html('<div data-alert id="alert-box" class="alert-box-wrapper alert-box alert radius" style="display:none;"> Loading... <a href="#" class="close">&times;</a> </div>');
    });*/
};

app.utils.notifyLogin = function (text, type, duration) {


    $('#alert-hook2').fadeIn();
    $('#alert-box2').fadeIn().addClass(type).html(text + '<a href="#" class="close">&times;</a>');

    // Types are: alert, success, warning, info
    if (duration != 0) {
        setTimeout(function () {
            $('.alert-box').removeClass(type).fadeOut().html('loading <a href="#" class="close">&times;</a>');
        }, duration * 1000);
    }
    $(document).on('close.alert', function (event) {
        $('#alert-hook2').html('<div data-alert id="alert-box" class=" alert-box alert radius" style="display:none;"> Loading... <a href="#" class="close">&times;</a> </div>');
    });
};


app.utils.internet = function () {
    //console.log('connectivty being monitored');
    window.addEventListener("offline", function (e) {
        app.utils.notify('internet connectivty lost. Please check your connection.', 'warning', 0);
    }, false);

    window.addEventListener("online", function (e) {
        app.utils.notify('internet connectivty restored', 'success', 3);
    }, false);
};

app.utils.redirectTo = function (path) {
    window.location.href = app.utils.domain() + path;
};

app.utils.reloadNavAndPanel = function () {
    app.utils.ajax.get(app.utils.currentUrl(true), {
        data: {
            partials: ['nav', 'panel']
        }
    }).then(function (data) {
        var el = document.createElement('div');
        el.innerHTML = data;
        var $el = $(el);
        app.$body.find('#nav').html($el.find('#nav').html());
        app.$body.find('#panel').html($el.find('#panel').html());

        // app.$body.find('#nav').html(data.nav);
        // app.$body.find('#panel').html(data.panel);
    });
};

app.utils.reloadPanel = function () {
    NProgress.start();
    app.utils.ajax.get(app.utils.currentUrl(true), {
        data: {
            partials: ['panel']
        }
    }).then(function (data) {
        NProgress.done();
        app.$body.find('#panel').empty().html(data.panel);
    });
};
app.utils.reloadNavOnly = function () {
    NProgress.start();
    app.utils.ajax.get(app.utils.currentUrl(true), {
        data: {
            partials: ['nav']
        }
    }).then(function (data) {
        NProgress.done();
        app.$body.find('#nav').html(data.nav);
    });
};

app.utils.btnStateChange = function (button, message, disabled) {
    var $button = button;
    var imgHtml = '<span class="has-spinner inBtnState">' +
        '<span class="spinner "><i class="icon-spin icon-refresh"></i></span></span>'


    if (disabled) {
        $button.addClass('fullbtn');
        $button.html(imgHtml);
        var $inBtnState = $button.find('.inBtnState');
        $inBtnState.html(message);

        $button.addClass('disabled');
    } else {
        $button.removeClass('fullbtn');
        $button.removeClass('disabled');
        $button.html(message);
    }

};

app.utils.btnUpvoteState = function (button, message, disabled) {
    var $button = button;
    var imgHtml = '<img src="/img/preloader.gif" class="left"/>' +
        '<div class="inBtnState">' +
        '</div>';


    if (disabled) {
        $button.addClass('fullbtn');
        $button.html(imgHtml);
        var $inBtnState = $button.find('.inBtnState');
        $inBtnState.html(message);

        $button.addClass('disabled');
    } else {
        $button.removeClass('fullbtn');
        $button.removeClass('disabled');
        $button.html(message);
    }

};

app.utils.requestSerializer = function (method, url, params) {
    app.requestArgs.method = method;
    app.requestArgs.url = url;
    app.requestArgs.params = params;
}

app.utils.requestDeserializer = function (args) {
    if (args.params) {
        app.utils.loadModal(args.params.modalId, args.url);
        args.params = {};
    } else {
        app.utils.ajax(args.method, args.url, args.params);
        app.utils.reloadNavAndPanel();
    }
}


app.utils.getFormData = function ($form) {
    var formData = {};
    var $inputEl = $form.find(":input").not("[type='submit']").not("[type='reset']");
    var $input = $inputEl;
    $input.each(function () {
        var thisInput = $(this);
        if (thisInput.attr("type") == "radio") {
            thisInput = thisInput.not(":not(:checked)");
        }
        var value = thisInput.val();
        formData[thisInput.attr("name")] = value ^ 0 === value ? parseInt(value) : value;
        // I can't decide whether to use data and value, name and value, or id and value or other combinations to take input data
    });
    delete formData['undefined'];
    return formData;
};


app.utils.goToByScroll = function (el) {
    $('body').animate({
            scrollTop: el.offsetTop
        },
        'slow');
};


/*app.utils.gallery = function(urls) {

    var pswpElement = document.querySelectorAll('.pswp')[0];

    // build items array
    var items = [];

    _.forEach(urls, function(url){
        items.push({
            src: 'sitecom/unsafe/fit-in/800x600/' + url.replace(/^https:\/\//i, 'http://'),
            w: 2400,
            h: 1800
        })
    });

    // define options (if needed)
    var options = {
        // optionName: 'option value'
        // for example:
        index: 0, // start at first slide
        showAnimationDuration : 333,
        closeOnScroll: false
    };

    // Initializes and opens PhotoSwipe

    var gallery = new PhotoSwipe( pswpElement, PhotoSwipeUI_Default, items, options);
    gallery.init();
}*/


app.utils.expandTextarea = function ($textarea) {
/*  var $element = $textarea.get(0);
  var height;*/
  var initHeight;

  $textarea.on('click', function(e){
    initHeight = $textarea.outerHeight();

    // Textarea Auto Resize
    var hiddenDiv = $('.hiddendiv').first();
    if (!hiddenDiv.length) {
      hiddenDiv = $('<div class="hiddendiv common"></div>');
      $('body').append(hiddenDiv);
    }
    var text_area_selector =  $textarea; //'.materialize-textarea';

    function textareaAutoResize($textarea) {
      // Set font properties of hiddenDiv

      var fontFamily = $textarea.css('font-family');
      var fontSize = $textarea.css('font-size');

      if (fontSize) { hiddenDiv.css('font-size', fontSize); }
      if (fontFamily) { hiddenDiv.css('font-family', fontFamily); }

      if ($textarea.attr('wrap') === "off") {
        hiddenDiv.css('overflow-wrap', "normal")
                 .css('white-space', "pre");
      }




      hiddenDiv.text($textarea.val() + '\n');
      var content = hiddenDiv.html().replace(/\n/g, '<br>');
      hiddenDiv.html(content);


      // When textarea is hidden, width goes crazy.
      // Approximate with half of window size

      if ($textarea.is(':visible')) {
        hiddenDiv.css('width', $textarea.width());
      }
      else {
        hiddenDiv.css('width', $(window).width()/2);
      }

      $textarea.css({height: hiddenDiv.height(), overflow: 'hidden'});
    }

    $(text_area_selector).each(function () {
      var $textarea = $(this);
      if ($textarea.val().length) {
        textareaAutoResize($textarea);
      }
    });

    $textarea.on('keyup keydown autoresize', text_area_selector, function () {
      if ($textarea.get(0).scrollHeight > initHeight) {
        textareaAutoResize($(this));

      };
    });



  });

 /* $textarea.on('keyup', function(e) {
      //$element.style.overflow = 'hidden';
      //$element.style.height = $element.scrollHeight + 'px';
      if (e.keyCode == 13) {
        height = $textarea.outerHeight() + 20;
      } else {
        height = $element.scrollHeight;

          var textLines = $(this).html().trim().split(/\r*\n/).length;
          var textHeight = (textLines*17);
          if (textHeight > initHeight) {
            height = textHeight + 5;
          } else {
            height = initHeight;
          };
      }
      $textarea.css({overflow: 'hidden', height: height + 'px'});
  });*/



}


app.utils.scrollLock = function(arr){
  _.forEach(arr, function(el){
      var $el = $(el);
      var $div = $el.parent();

      var divHeight = $div.outerHeight();
      var width = $div.parent().width();
      var top = $div.parent().offset().top;
      var left = $div.offset().left;
      var totalHeight = top + divHeight;
      var diffHeight = totalHeight - app.$window.height();
      var cssTop = divHeight < app.$window.height() ? 50 : (top - diffHeight);

      if (app.$window.scrollTop() > top ) {
        if (!($div.hasClass('stop-scroll'))) {
          $div.addClass('stop-scroll').css({top: cssTop, left: left, width: width});
        }
      }else {
        $div.removeClass('stop-scroll');
      };
    });

    }

app.utils.getPartial = function (url, partial, $parent) {
      var data = {
        partials: [partial],
      }
      $parent.html(app.utils.preloaderHtml());
      app.utils.ajax.get(url, {
        data
      }).then(function (data) {
        var el = document.createElement('div');
        el.innerHTML = data[partial];
        if ($(el).html().trim() !=  '') {
          if ($parent) {
            $parent.html($(el).html());
            //console.log($(el).html(), $parent);
          } else {
            //app.$body.find('#panel').html($(el).find('#panel').html());
          }
        } else {
          toastr.error('server error 500', 'try refreshing page !');
        };
      }, function (err) {
          toastr.error('loading failed', 'oops !');
      });
  };

  app.utils.SmoothlyMenu = function () {
      if (!$('body').hasClass('mini-navbar') || $('body').hasClass('body-small')) {
          // Hide menu in order to smoothly turn on when maximize menu
          $('#side-menu').hide();
          // For smoothly turn on menu
          setTimeout(
              function () {
                  $('#side-menu').fadeIn(500);
              }, 100);
      } else if ($('body').hasClass('fixed-sidebar')) {
          $('#side-menu').hide();
          setTimeout(
              function () {
                  $('#side-menu').fadeIn(500);
              }, 300);
      } else {
          // Remove all inline style from jquery fadeIn function to reset menu state
          $('#side-menu').removeAttr('style');
      }
  };

  app.utils.scrollToDiv = function ($div) {
    app.$body.animate({
      scrollTop: $div.offset().top
    }, 2000);
  };

// modal bg-z-index
app.utils.modalBgZIndex = 1050;

// load a particular modal via its selector
// optionally provide html via a url
// and run an optional callback on completion
app.utils.loadModal = function (selector, url, callback, stacked) {
  // modals stack by default, ie. more than one modals can open at a time
  var stacked = stacked === false ? false : true;

  var modalLoader = function () {
    callback = typeof(callback) === 'function' ? callback : function () { };

    // if selector provided is an instance of jquery, then that is our modal
    // otherwise we try to find the modal using jquery
    var $modal = selector instanceof $ ? selector : $(selector);
    // if the modal provided is not one single modal, do nothing
    if ($modal.length !== 1) return;

    // attach and animate modal bg if it is not loaded already
    var $modalBg = $('div.modal-backdrop');
    if ($modalBg.length === 0) {
      //$modalBg = $($.parseHTML('<div class="modal-backdrop" style="display: none;"></div>'));
      app.$body.append($modalBg);
      $modalBg.css({zIndex: app.utils.modalBgZIndex}).fadeIn(200);
    }

    var openModal = function () {
      // get modalIndex
      var modalIndex = $('div.modal.open').length + 1;

      // hook in the modal closer
      $modal.modal('show');
      //$modal.find('i.icon-close').on('click', function () { app.utils.unloadModal($modal); });
      $modal.addClass('open');

      // open the modal
      /*$modal.css('top', '50px');*/
      $modal.animate(
        {
          opacity: 1
        }, 
        {
          complete: function () {
            app.vent.trigger('modal.opened', $modal);
            callback();
          }
        }
      );
    };

    if (url === undefined || url === null) {
      openModal();
    } else {
      app.utils.ajax.get(url).then(function (html) {
        $modal.html(html);
        openModal();        
      });
    }

    // close modal on clicking modal bg
    $modalBg.on('click', app.utils.unloadOpenModals);
  };

  // if the loadModal call is not stacked, then unloadOpenModals before
  // loading our target modal. Otherwise just load our modal
  if (! stacked) {
    app.utils.unloadOpenModals(modalLoader);
  } else {
    modalLoader();
  }
};

// unload $modal
app.utils.unloadModal = function ($modal, callback) {
  callback = typeof(callback) === 'function' ? callback : function () { };

  if ($modal.length > 0) {
    $modal.animate(
      {},
      {
        done: function () {
          $modal.removeClass('open');
          $modal.modal('hide');
          var $openModals = $('div.modal.open');
          if ($openModals.length === 0) {
            var $modalBg = $('div.modal-backdrop');
            $modalBg.fadeOut(200, function () {
              $modalBg.remove();
            });
          }
          app.vent.trigger('modal.closed', $modal[0]);
          callback();
        }
      }
    );
  } else {
    callback();
  }
};

// unload already opened modal and call a callback
app.utils.unloadOpenModals = function (callback) {
  callback = typeof(callback) === 'function' ? callback : function () { };

  var $modals = $('div.modal.open');

  app.utils.unloadModal($modals, callback);
}

// close any open modal escape key press event
app.$document.on('keyup', function (ev) {
  if (ev.keyCode === 27) {
    app.utils.unloadOpenModals();
  }
});
app.behaviors.global = function () {

  /**
   * top level search box
   */
  // var headerHeight = $('.navbar').outerHeight();
  // var marNegSearch = 200; //parseInt($('.search-box-banner').css('top'));
  // var calc = headerHeight + marNegSearch;
  // var scrollTop = app.$window.scrollTop();
  //     if (scrollTop > 200 || app.pagename == 'profile') {
  //       $('.search-box-nav').show();
  //       //$('.search-box-banner').removeClass('search');
  //       $('.mobile-brand-logo').hide();
  //     }
  //
  //
  // app.$document.ready(function(){
  //   app.pagename = $('#panel').data('page-name');
  //   if (app.pagename === 'homepage') {
  //     app.utils.scrollLock($('.scroll-lock'));
  //   };
  //
  //
  // });
  //
  app.$window.on("scroll", function(e) {
    var scrollTop = app.$window.scrollTop();
        if (scrollTop > 600 || app.pagename == 'profile' /*calc/2*/) {
            $('nav').addClass('navbar-fixed-top');

        } else {
          $('nav').removeClass('navbar-fixed-top');

        }

    if (app.pagename === 'homepage') {
      app.utils.scrollLock($('.scroll-lock'));
    };


  });




};

$(function(){
  app.behaviors.global();
});

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
    //console.log(template);

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
