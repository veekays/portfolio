app.behaviors.global = function () {

  app.$window.on("scroll", function(e) {
    if (app.$body.height() > $(".equal").height()) {
      $(".equal").height(app.$body.height());
    }
    var scrollTop = app.$window.scrollTop();
        if (scrollTop > 600 ) {

        } else {

        }
  });

  };

$(function(){
  app.behaviors.global();
});
