/* Regan Feste – site interactions (vanilla JS, no dependencies) */
(function () {
  'use strict';

  /* ---------- Config ---------- */
  // Form endpoint preserved from the live site (form action="sendmail.php").
  // Point this at your mail handler / form service when deploying elsewhere.
  var FORM_ENDPOINT = 'sendmail.php';
  // Business WhatsApp number as used on the live site (country code, no "+").
  var WHATSAPP_NUMBER = '919480808099';
  var HERO_INTERVAL_MS = 5500;
  // Contact page form API. The browser sends the site's Origin, which the API uses
  // to identify the registered website (reganfeste.in, incl. www).
  var CONTACT_API_URL = 'https://k5iewetbri.execute-api.ap-south-1.amazonaws.com/prod/contact';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mqDesktop = window.matchMedia('(min-width: 1081px)');

  /* ---------- Fixed header: deeper shadow once the page scrolls ---------- */
  var header = document.querySelector('.site-header');
  if (header) {
    var ticking = false;
    var updateHeader = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(updateHeader); }
    }, { passive: true });
    updateHeader();
  }

  /* ---------- Footer attribution: text fallback if the logo can't load ---------- */
  var poweredImg = document.querySelector('.powered-by img');
  if (poweredImg) {
    var showPoweredName = function () {
      poweredImg.hidden = true;
      poweredImg.nextElementSibling.hidden = false;
    };
    if (poweredImg.complete && poweredImg.naturalWidth === 0) showPoweredName();
    else poweredImg.addEventListener('error', showPoweredName);
  }

  /* ---------- Mobile navigation ---------- */
  var nav = document.getElementById('main-nav');
  var toggle = document.querySelector('.nav-toggle');
  var closeBtn = document.querySelector('.nav-close');
  var backdrop = document.querySelector('.nav-backdrop');

  function focusables() {
    return Array.prototype.filter.call(
      nav.querySelectorAll('a[href], button:not([disabled])'),
      function (el) { return el.offsetParent !== null; }
    );
  }

  function openNav() {
    nav.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('nav-open');
    backdrop.hidden = false;
    requestAnimationFrame(function () { backdrop.classList.add('is-visible'); });
    setTimeout(function () { closeBtn.focus(); }, 50);
  }

  function closeNav(returnFocus) {
    if (!nav.classList.contains('is-open')) return;
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
    backdrop.classList.remove('is-visible');
    setTimeout(function () { backdrop.hidden = true; }, 300);
    if (returnFocus) toggle.focus();
  }

  toggle.addEventListener('click', openNav);
  closeBtn.addEventListener('click', function () { closeNav(true); });
  backdrop.addEventListener('click', function () { closeNav(true); });

  // Close the panel after choosing an in-page link
  nav.addEventListener('click', function (e) {
    var link = e.target.closest('a');
    if (link && !mqDesktop.matches) closeNav(false);
  });

  // Trap focus inside the open mobile panel
  nav.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || !nav.classList.contains('is-open')) return;
    var items = focusables();
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // Reset state when resizing up to desktop
  mqDesktop.addEventListener('change', function (e) { if (e.matches) closeNav(false); });

  /* ---------- Services dropdown (disclosure pattern) ---------- */
  var dropdownItems = document.querySelectorAll('.has-dropdown');

  function setDropdown(item, open) {
    item.classList.toggle('is-open', open);
    item.querySelector('.dropdown-toggle').setAttribute('aria-expanded', String(open));
  }

  Array.prototype.forEach.call(dropdownItems, function (item) {
    var btn = item.querySelector('.dropdown-toggle');
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      setDropdown(item, !item.classList.contains('is-open'));
    });
    // Desktop: close when focus leaves the menu
    item.addEventListener('focusout', function (e) {
      if (mqDesktop.matches && !item.contains(e.relatedTarget)) setDropdown(item, false);
    });
    // Keep aria-expanded in sync with hover on desktop
    item.addEventListener('mouseenter', function () { if (mqDesktop.matches) btn.setAttribute('aria-expanded', 'true'); });
    item.addEventListener('mouseleave', function () {
      if (mqDesktop.matches && !item.classList.contains('is-open')) btn.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('click', function (e) {
    if (!mqDesktop.matches) return;
    Array.prototype.forEach.call(dropdownItems, function (item) {
      if (!item.contains(e.target)) setDropdown(item, false);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    Array.prototype.forEach.call(dropdownItems, function (item) {
      if (item.classList.contains('is-open')) {
        setDropdown(item, false);
        item.querySelector('.dropdown-toggle').focus();
      }
    });
    closeNav(true);
  });

  /* ---------- Hero background slideshow ---------- */
  var hero = document.querySelector('.hero');
  var slides = hero ? hero.querySelectorAll('.hero-slide') : [];
  if (slides.length > 1) {
    var current = 0;
    var timer = null;
    var hovered = false;
    var focused = false;
    var dots = hero.querySelectorAll('.hero-dot');
    var prevBtn = hero.querySelector('.hero-prev');
    var nextBtn = hero.querySelector('.hero-next');
    var dotsWrap = hero.querySelector('.hero-dots');

    var loadSlide = function (slide) {
      var src = slide.getAttribute('data-bg');
      if (src) {
        slide.style.backgroundImage = "url('" + src + "')";
        slide.removeAttribute('data-bg');
      }
    };

    // Preload the next image one step ahead so crossfades never flash empty
    var preload = function (index) {
      var slide = slides[index];
      var src = slide.getAttribute('data-bg');
      if (!src) return;
      var img = new Image();
      img.onload = function () { loadSlide(slide); };
      img.src = src;
    };

    var goTo = function (index) {
      var next = (index + slides.length) % slides.length;
      if (next === current) return;
      loadSlide(slides[next]);
      slides[current].classList.remove('is-active');
      slides[next].classList.add('is-active');
      if (dots[current]) dots[current].removeAttribute('aria-current');
      if (dots[next]) dots[next].setAttribute('aria-current', 'true');
      current = next;
      preload((next + 1) % slides.length);
    };

    // Autoplay only when motion is allowed, and never while the visitor is
    // pointing at or tabbing through the hero.
    var stop = function () { clearInterval(timer); timer = null; };
    var start = function () {
      stop();
      if (reduceMotion || hovered || focused) return;
      timer = setInterval(function () {
        if (!document.hidden) goTo(current + 1);
      }, HERO_INTERVAL_MS);
    };

    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(current - 1); start(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(current + 1); start(); });
    Array.prototype.forEach.call(dots, function (dot, i) {
      dot.addEventListener('click', function () { goTo(i); start(); });
    });
    [prevBtn, nextBtn, dotsWrap].forEach(function (el) { if (el) el.hidden = false; });

    // Mouse only: a tap fires enter without a matching leave, which would stall autoplay
    hero.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'mouse') { hovered = true; stop(); }
    });
    hero.addEventListener('pointerleave', function (e) {
      if (e.pointerType === 'mouse') { hovered = false; start(); }
    });
    // Keyboard focus only, so tapping a dot doesn't leave the slideshow paused
    var keyboardFocus = function (el) {
      try { return el.matches(':focus-visible'); } catch (err) { return true; }
    };
    hero.addEventListener('focusin', function (e) {
      if (keyboardFocus(e.target)) { focused = true; stop(); }
    });
    hero.addEventListener('focusout', function (e) {
      if (!hero.contains(e.relatedTarget)) { focused = false; start(); }
    });

    window.addEventListener('load', function () { preload(1); });
    start();
  }

  /* ---------- Scroll reveal ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    Array.prototype.forEach.call(reveals, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(reveals, function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Stat counters (About page) ---------- */
  // Final values are in the HTML, so the numbers are correct without JS;
  // this only animates from data-from to data-to when the stat scrolls into view.
  var counters = document.querySelectorAll('.stat-num[data-to]');
  if (counters.length && 'IntersectionObserver' in window && !reduceMotion) {
    var runCounter = function (el) {
      var from = parseInt(el.getAttribute('data-from'), 10) || 0;
      var to = parseInt(el.getAttribute('data-to'), 10);
      var duration = 2000;
      var start = null;
      var step = function (ts) {
        if (start === null) start = ts;
        var t = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(from + (to - from) * eased).toLocaleString('en-IN');
        if (t < 1) requestAnimationFrame(step);
      };
      el.textContent = from;
      requestAnimationFrame(step);
    };
    var counterIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          runCounter(entry.target);
          counterIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    Array.prototype.forEach.call(counters, function (el) { counterIO.observe(el); });
  }

  /* ---------- Booking form ---------- */
  var form = document.getElementById('event-form');
  if (form) {
    var status = form.querySelector('.form-status');
    var submitBtn = form.querySelector('button[type="submit"]');
    var messages = {
      name: 'Please enter your full name.',
      phone: 'Please enter a valid phone number.',
      email: 'Please enter a valid email address.',
      event_type: 'Please select an event type.'
    };

    var validateField = function (field) {
      var wrap = field.closest('.field');
      var err = wrap && wrap.querySelector('.field-error');
      var valid = field.checkValidity();
      if (wrap) wrap.classList.toggle('has-error', !valid);
      field.setAttribute('aria-invalid', String(!valid));
      if (err) {
        err.textContent = valid ? '' : (messages[field.name] || field.validationMessage);
        if (!valid) field.setAttribute('aria-describedby', err.id);
        else field.removeAttribute('aria-describedby');
      }
      return valid;
    };

    // Clear an error as soon as the field is corrected. Validating on blur instead
    // shifts the layout mid-click and can make the submit button miss the click.
    var revalidate = function (e) {
      var wrap = e.target.closest('.field');
      if (wrap && wrap.classList.contains('has-error')) validateField(e.target);
    };
    form.addEventListener('input', revalidate);
    form.addEventListener('change', revalidate);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.textContent = '';
      status.className = 'form-status';

      var required = form.querySelectorAll('[required]');
      var firstInvalid = null;
      Array.prototype.forEach.call(required, function (f) {
        if (!validateField(f) && !firstInvalid) firstInvalid = f;
      });
      if (firstInvalid) { firstInvalid.focus(); return; }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      fetch(FORM_ENDPOINT, { method: 'POST', body: new FormData(form) })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          form.reset();
          status.classList.add('is-success');
          status.textContent = 'Thank you! Our team will contact you shortly.';
        })
        .catch(function () {
          status.classList.add('is-error');
          status.innerHTML = 'Sorry, we couldn’t send your inquiry right now. Please reach us on ' +
            '<a href="https://api.whatsapp.com/send?phone=' + WHATSAPP_NUMBER + '" target="_blank" rel="noopener">WhatsApp</a>' +
            ' or call <a href="tel:+919480808099">9480808099</a>.';
        })
        .then(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Inquiry';
        });
    });
  }
  /* ---------- Contact page form ---------- */
  var contactForm = document.getElementById('contact-form');
  if (contactForm) {
    var cStatus = contactForm.querySelector('.form-status');
    var cSubmit = contactForm.querySelector('button[type="submit"]');
    var cSubmitLabel = cSubmit.textContent;
    var cSending = false;
    var cMessages = {
      name: 'Please enter your name.',
      email: 'Please enter a valid email address.'
    };

    var checkField = function (field) {
      var wrap = field.closest('.field');
      var err = wrap.querySelector('.field-error');
      var value = field.value.trim();
      var valid = value !== '' && field.checkValidity() &&
        (field.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
      wrap.classList.toggle('has-error', !valid);
      field.setAttribute('aria-invalid', String(!valid));
      err.textContent = valid ? '' : cMessages[field.name];
      if (valid) field.removeAttribute('aria-describedby');
      else field.setAttribute('aria-describedby', err.id);
      return valid;
    };

    contactForm.addEventListener('input', function (e) {
      var wrap = e.target.closest('.field');
      if (wrap && wrap.classList.contains('has-error')) checkField(e.target);
    });

    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var invalid = null;
      Array.prototype.forEach.call(contactForm.querySelectorAll('[required]'), function (f) {
        if (!checkField(f) && !invalid) invalid = f;
      });
      if (invalid) { invalid.focus(); return; }

      if (cSending) return; // ignore repeat clicks while a request is in flight
      cSending = true;
      cSubmit.disabled = true;
      cSubmit.textContent = 'Sending...';
      cStatus.className = 'form-status';
      cStatus.textContent = '';

      var payload = {
        firstName: contactForm.elements.namedItem('name').value.trim(),
        email: contactForm.elements.namedItem('email').value.trim(),
        message: contactForm.elements.namedItem('message').value.trim()
      };

      fetch(CONTACT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) {
            return res.text().then(function (text) {
              throw new Error('HTTP ' + res.status + (text ? ': ' + text : ''));
            });
          }
          contactForm.reset();
          cStatus.className = 'form-status is-success';
          cStatus.textContent = 'Thank you! Your message has been sent successfully. Our team will contact you shortly.';
        })
        .catch(function (err) {
          console.error('Contact form submission failed:', err);
          cStatus.className = 'form-status is-error';
          cStatus.textContent = 'Something went wrong. Please try again or contact us directly.';
        })
        .then(function () {
          cSending = false;
          cSubmit.disabled = false;
          cSubmit.textContent = cSubmitLabel;
        });
    });
  }
})();
