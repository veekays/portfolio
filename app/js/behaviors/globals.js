app.behaviors.global = function () {

  app.$window.on("scroll", function(e) {
    var scrollTop = app.$window.scrollTop();
        if (scrollTop > 600 ) {

        } else {

        }


  });

};

$(function(){
  app.behaviors.global();
});
