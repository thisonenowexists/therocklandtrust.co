$(document).ready(function () {


    $('.navbar-toggler').click(function (e) {

        e.stopPropagation();
        $('.navbar-nav').slideToggle();

    });

    $(".navbar-toggler").click(function () {
        $(".navbar-toggler").toggleClass("close_button");
        $("body").toggleClass("remove_nav");
    });

    //    $(".navbar-nav li.menu-item-has-children").click(function () {
    //        $(this).find('.sub-menu').toggleClass('toggle_open');
    //        $(this).find('.caret_down').toggleClass('arrow_up');
    //    });


    $(".sort_box").click(function (e) {
        e.preventDefault();
        $(".sortstyle").toggleClass('open');

    });

    $(".dots_circle").click(function (e) {
        e.preventDefault();
        //        $(".scoial_hover").toggleClass('open');

        $(this).find(".scoial_hover").toggleClass('open');
        $(this).parents('.article_wrapper').siblings('.article_wrapper').find(".scoial_hover").removeClass('open');

    });




    //loadmore news









});

$(window).scroll(function () {
    if ($(window).scrollTop() >= 200) {
        $('header').addClass('fixed-header');
    } else {
        $('header').removeClass('fixed-header');
    }
});



//$(window).on("load, resize", function () {
//    var viewportWidth = $(window).width();
//    if (viewportWidth < 1023) {
//        $('.menu').append('<div class="top_bar"></div>');
//    }
//});



var i = 1;
// top bag
$(window).on("load resize", function (e) {

    if ($(window).width() < 1025) {
        if (i == 1) {
            $(".top_bar").clone().insertAfter(".menu");
            i++;
        }
        $("#collapsibleNavbar").removeAttr('style');
        $("#collapsibleNavbar .top_bar").css('display', 'block');
    } else {
        $("#collapsibleNavbar .top_bar").css('display', 'none');
        $("#collapsibleNavbar").css('display', 'flex');
    }
});
// init Isotope
