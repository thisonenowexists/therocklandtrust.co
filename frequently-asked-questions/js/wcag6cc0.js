$('#wcag-toggle a').on('click', function(evt) {
    evt.preventDefault();
    var name = 'wcag-enhancement';
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');

    var wcagEnhancement = '';
     
    for(let i = 0; i <ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        wcagEnhancement = c.substring(name.length, c.length);
        break;
      }
    }

    if (wcagEnhancement=='') {
        wcagEnhancement = 'on';
        var d = new Date();
        d.setTime(d.getTime() + (365*24*60*60*1000));
        var expires = 'expires='+ d.toUTCString();
        document.cookie = 'wcag-enhancement=' + wcagEnhancement + ';path=/;' + expires + ';';
    } else {
        document.cookie = 'wcag-enhancement=;path=/;max-age=-1;';
    }
    
    location.reload();

    return false;
});

$(".selectric-input").attr("tabindex", "-1");

function buildTransscript(data, audio, transcript) {
    //<ul class="accordion" data-accordion="" data-multi-expand="true" data-allow-all-closed="true" role="tablist" data-t="0neq7w-t"></ul>

    var ul = document.createElement("ul");
    ul.setAttribute("data-accordion", "");
    ul.setAttribute("role", "tablist");

    var li = document.createElement("li");
    li.setAttribute("data-accordion-item", "");
    li.innerText = data;
    ul.appendChild(li);

    audio.parentElement.insertBefore(ul, audio);
}

var audios = $('audio');

// for (var i = 0; i < audios.length; i++) {
//     var audio = audios[i];
//     var transcript = audio.dataset['transcript'];
    
//     if (transcript) {
//         $.get(transcript, function(data) {
//             buildTransscript(data, audio, transcript);
//          }, 'text');
//     } else {
//         // no transcript
//         var div = document.createElement("div");
//         div.innerText = "No transcript available.";
//         audio.parentElement.insertBefore(div, audio);
//     }
// }
$().ready(function() {

    // $('.account a:first-child').each(function(idx, el) {
    //     var $el = $(el);
    //     var txt = $el.text();
    //     $(el).text(txt + ' to Online Banking'); 
    // });

    $('.callout.blue-callouts .blue-btn').each(function(idx, el) {
        var $el = $(el);
        var txt = $el.text();
        $el.attr('aria-label', txt + ': ' + el.parentElement.firstElementChild.textContent); 
    });

    $('.--fiq--').each(function() {
        console.log('is fiq page');
        $('.blue-btn.card-btn.ext_link').each(function(idx, el) {
            var $explore = $(el);
            $explore.attr('aria-label','Explore:' + $(el.parentElement.parentElement).find('.card-title').text());
        });
    });

    $('.--privacy-policy--').each(function() {
        console.log('is privacy policy page');
        $('td').filter(function() {
            var match = 'rgb(167, 169, 172)'; // match background-color: black
            /*
                true = keep this element in our wrapped set
                false = remove this element from our wrapped set
                                                                 */
            return ( $(this).css('background-color') == match );
        }).css('background-color', 'black');
    });

    $('.--wealth-management--, .--commercial-services--, .--personal-banking--').each(function() {
        console.log('is wealth management || commercial services || personal banking page');
        $('a').filter(function(index) { return $(this).text() === "Learn More"; }).each( function (idx, el) {
            var $el = $(el);
            var $txt = $el.text();
            $el.attr("aria-label",$txt + ': ' + el.parentElement.firstElementChild.textContent);
        });
    });

    $('html[class*=--locations-atms--]').each(function() {
        console.log('is a location atm page');
        $('.view-map').each(function(idx, el) {  //.ext_link
            $(el).text('View Map for ' + el.parentElement.parentElement.firstElementChild.textContent);
        });
    });

    $('a[href*=mailto]').each(function(idx, el) {
        console.log('mailto link');
        var $el = $(el);
        var txt = $el.text();
        var name = el.parentElement.parentElement.firstElementChild.textContent;
        $el.text(txt + ' ' + name);
    });
});
