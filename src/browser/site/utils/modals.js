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