'use strict';

/**
 * INSPINIA - Responsive Admin Theme
 * 2.2
 *
 * Custom scripts
 */

$(document).ready(function () {
  // Append config box / Only for demo purpose
  $.get('views/skin-config.html', function (data) {
    $('body').append(data);
  });

  $(window).bind('load resize scroll', function () {
    if (!$('body').hasClass('body-small')) {
      fixHeight();
    }
  });

  // Move right sidebar top after scroll
  $(window).scroll(function () {
    if ($(window).scrollTop() > 0 && !$('body').hasClass('fixed-nav')) {
      $('#right-sidebar').addClass('sidebar-top');
    } else {
      $('#right-sidebar').removeClass('sidebar-top');
    }
  });

  setTimeout(function () {
    fixHeight();
  });

  // Full height of sidebar
  function fixHeight() {
    var heightWithoutNavbar = $('body > #wrapper').height() - 61;
    $('.sidebard-panel').css('min-height', heightWithoutNavbar + 'px');

    var navbarHeigh = $('nav.navbar-default').height();
    var wrapperHeigh = $('#page-wrapper').height();

    if (navbarHeigh > wrapperHeigh) {
      $('#page-wrapper').css('min-height', navbarHeigh + 'px');
    }

    if (navbarHeigh < wrapperHeigh) {
      $('#page-wrapper').css('min-height', $(window).height() + 'px');
    }

    if ($('body').hasClass('fixed-nav')) {
      $('#page-wrapper').css('min-height', $(window).height() - 60 + 'px');
    }
  }
});

// Minimalize menu when screen is less than 768px
$(function() {
  $(window).bind('load resize', function() {
    if ($(this).width() < 769) {
      $('body').addClass('body-small');
    } else {
      $('body').removeClass('body-small');
    }
  });
})
