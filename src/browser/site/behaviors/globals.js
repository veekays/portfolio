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
