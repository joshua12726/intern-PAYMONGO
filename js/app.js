/* ============================================================
   ELECTRO - Core App Logic
   Cart, Wishlist, Search, Filters, Checkout & Page Rendering
   ============================================================ */

(function ($) {
	"use strict";

	/* ---------------- Storage ---------------- */

	var CART_KEY = 'electro_cart';
	var WISH_KEY = 'electro_wishlist';
	var REVIEWS_KEY = 'electro_reviews';
	var ORDER_KEY = 'electro_last_order';

	function readStore(key, fallback) {
		try {
			var raw = localStorage.getItem(key);
			return raw ? JSON.parse(raw) : fallback;
		} catch (e) {
			return fallback;
		}
	}

	function writeStore(key, value) {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch (e) { /* storage unavailable */ }
	}

	function money(n) {
		return '\u20B1' + Number(n || 0).toFixed(2);
	}

	function escAttr(s) {
		var AMP = '&' + 'amp;';
		var LT = '&' + 'lt;';
		var GT = '&' + 'gt;';
		var QUOT = '&' + 'quot;';
		return String(s).replace(/&/g, AMP).replace(/</g, LT).replace(/>/g, GT).replace(/"/g, QUOT);
	}

	function getUrlParam(name) {
		name = name.replace(/[\[\]]/g, '\\$&');
		var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(window.location.href);
		return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : null;
	}

	function formatDate(d) {
		var months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
		var h = d.getHours();
		var ampm = h >= 12 ? 'PM' : 'AM';
		h = h % 12; if (h === 0) h = 12;
		var mm = d.getMinutes(); if (mm < 10) mm = '0' + mm;
		return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear() + ', ' + h + ':' + mm + ' ' + ampm;
	}

	/* ---------------- Cart ---------------- */

	function getCart() {
		return readStore(CART_KEY, []);
	}

	function saveCart(cart) {
		writeStore(CART_KEY, cart);
		refreshHeader();
	}

	function addToCart(id, qty) {
		id = parseInt(id, 10);
		qty = Math.max(1, parseInt(qty, 10) || 1);
		var cart = getCart();
		var found = false;
		for (var i = 0; i < cart.length; i++) {
			if (parseInt(cart[i].id, 10) === id) {
				cart[i].id = id;
				cart[i].qty = Math.min(99, Math.max(1, parseInt(cart[i].qty, 10) || 1) + qty);
				found = true;
				break;
			}
		}
		if (!found) cart.push({ id: id, qty: qty });
		saveCart(cart);
	}

	function removeFromCart(id) {
		id = parseInt(id, 10);
		saveCart(getCart().filter(function (item) { return parseInt(item.id, 10) !== id; }));
	}

	function setCartQty(id, qty) {
		id = parseInt(id, 10);
		qty = Math.max(1, parseInt(qty, 10) || 1);
		var cart = getCart();
		for (var i = 0; i < cart.length; i++) {
			if (parseInt(cart[i].id, 10) === id) { cart[i].id = id; cart[i].qty = qty; break; }
		}
		saveCart(cart);
	}

	function clearCart() {
		saveCart([]);
	}

	function cartCount() {
		return getCart().reduce(function (sum, item) { return sum + (parseInt(item.qty, 10) || 0); }, 0);
	}

	function cartSubtotal() {
		return getCart().reduce(function (sum, item) {
			var p = getProductById(item.id);
			return sum + (p ? p.price * item.qty : 0);
		}, 0);
	}

	/* ---------------- Wishlist ---------------- */

	function getWishlist() {
		return readStore(WISH_KEY, []);
	}

	function isWishlisted(id) {
		return getWishlist().indexOf(parseInt(id, 10)) !== -1;
	}

	function toggleWishlist(id) {
		id = parseInt(id, 10);
		var list = getWishlist();
		var idx = list.indexOf(id);
		if (idx === -1) { list.push(id); } else { list.splice(idx, 1); }
		writeStore(WISH_KEY, list);
		refreshHeader();
		return idx === -1;
	}

	/* ---------------- Reviews ---------------- */

	var DEFAULT_REVIEWS = [
		{ name: 'John Doe', date: '12 JAN 2026, 3:24 PM', rating: 5, text: 'Excellent product, exactly as described. Fast shipping too!' },
		{ name: 'Sarah Miller', date: '03 FEB 2026, 11:05 AM', rating: 4, text: 'Great quality for the price. Would definitely recommend.' },
		{ name: 'Mike Chen', date: '19 FEB 2026, 6:41 PM', rating: 4, text: 'Works perfectly. Very satisfied with this purchase.' }
	];

	function getReviews(productId) {
		var stored = readStore(REVIEWS_KEY, {});
		return DEFAULT_REVIEWS.concat(stored[productId] || []);
	}

	function addReview(productId, review) {
		var stored = readStore(REVIEWS_KEY, {});
		if (!stored[productId]) stored[productId] = [];
		stored[productId].push(review);
		writeStore(REVIEWS_KEY, stored);
	}

	/* ---------------- Orders ---------------- */

	function getLastOrder() {
		return readStore(ORDER_KEY, null);
	}

	/* ---------------- Render helpers ---------------- */

	function starsHTML(rating) {
		var html = '';
		for (var i = 1; i <= 5; i++) {
			html += '<i class="fa ' + (i <= rating ? 'fa-star' : 'fa-star-o') + '"></i>';
		}
		return html;
	}

	function labelsHTML(p) {
		var html = '';
		if (p.oldPrice > p.price) {
			html += '<span class="sale">-' + Math.round((1 - p.price / p.oldPrice) * 100) + '%</span>';
		}
		if (p.isNew) {
			html += '<span class="new">NEW</span>';
		}
		return html ? '<div class="product-label">' + html + '</div>' : '';
	}

	function productInnerHTML(p) {
		return '' +
			'<div class="product">' +
				'<div class="product-img">' +
					'<img src="' + p.img + '" alt="' + escAttr(p.name) + '">' +
					labelsHTML(p) +
				'</div>' +
				'<div class="product-body">' +
					'<p class="product-category">' + p.category + '</p>' +
					'<h3 class="product-name"><a href="product.html?id=' + p.id + '">' + p.name + '</a></h3>' +
					'<h4 class="product-price">' + money(p.price) + ' <del class="product-old-price">' + money(p.oldPrice) + '</del></h4>' +
					'<div class="product-rating">' + starsHTML(p.rating) + '</div>' +
					'<div class="product-btns">' +
						'<button class="add-to-wishlist" data-id="' + p.id + '"><i class="fa fa-heart-o"></i><span class="tooltipp">add to wishlist</span></button>' +
						'<button class="add-to-compare" data-id="' + p.id + '"><i class="fa fa-exchange"></i><span class="tooltipp">add to compare</span></button>' +
						'<button class="quick-view" data-id="' + p.id + '"><i class="fa fa-eye"></i><span class="tooltipp">quick view</span></button>' +
					'</div>' +
				'</div>' +
				'<div class="add-to-cart">' +
					'<button class="add-to-cart-btn" data-id="' + p.id + '"><i class="fa fa-shopping-cart"></i> add to cart</button>' +
				'</div>' +
			'</div>';
	}

	function productCardHTML(p, colClass) {
		if (!colClass) return productInnerHTML(p);
		return '<div class="' + colClass + '">' + productInnerHTML(p) + '</div>';
	}

	function productWidgetHTML(p) {
		return '' +
			'<div class="product-widget">' +
				'<div class="product-img">' +
					'<img src="' + p.img + '" alt="' + escAttr(p.name) + '">' +
				'</div>' +
				'<div class="product-body">' +
					'<p class="product-category">' + p.category + '</p>' +
					'<h3 class="product-name"><a href="product.html?id=' + p.id + '">' + p.name + '</a></h3>' +
					'<h4 class="product-price">' + money(p.price) + ' <del class="product-old-price">' + money(p.oldPrice) + '</del></h4>' +
				'</div>' +
			'</div>';
	}

	function cartWidgetHTML(item) {
		var p = getProductById(item.id);
		if (!p) return '';
		return '' +
			'<div class="product-widget">' +
				'<div class="product-img">' +
					'<img src="' + p.img + '" alt="' + escAttr(p.name) + '">' +
				'</div>' +
				'<div class="product-body">' +
					'<h3 class="product-name"><a href="product.html?id=' + p.id + '">' + p.name + '</a></h3>' +
					'<h4 class="product-price"><span class="qty">' + item.qty + 'x</span>' + money(p.price * item.qty) + '</h4>' +
				'</div>' +
				'<button class="delete" data-id="' + p.id + '"><i class="fa fa-close"></i></button>' +
			'</div>';
	}

	/* ---------------- Toast ---------------- */

	function toast(msg) {
		var $t = $('#electro-toast');
		if (!$t.length) {
			$t = $('<div id="electro-toast" class="electro-toast"></div>').appendTo('body');
		}
		$t.text(msg).addClass('show');
		clearTimeout(toast._timer);
		toast._timer = setTimeout(function () { $t.removeClass('show'); }, 1800);
	}

	/* ---------------- Header (cart + wishlist badges) ---------------- */

	function refreshHeader() {
		var cart = getCart();

		$('#wishlist-qty').text(getWishlist().length);
		$('#cart-qty').text(cartCount());

		var $list = $('#cart-dropdown-list');
		if ($list.length) {
			if (!cart.length) {
				$list.html('<p class="cart-empty"><i class="fa fa-shopping-cart"></i> Your cart is empty.</p>');
			} else {
				$list.html(cart.map(cartWidgetHTML).join(''));
			}
			$('#cart-summary-count').text(cartCount() + ' Item(s) selected');
			$('#cart-subtotal').text('SUBTOTAL: ' + money(cartSubtotal()));
		}

		// Sync wishlist heart icons on all product cards
		$('.add-to-wishlist[data-id]').each(function () {
			var active = isWishlisted($(this).data('id'));
			$(this).find('i').attr('class', active ? 'fa fa-heart' : 'fa fa-heart-o');
			$(this).toggleClass('active', active);
		});

		// Sync detail-page wishlist link
		var $dw = $('#detail-wishlist');
		if ($dw.length && $dw.data('id')) {
			var activeDw = isWishlisted($dw.data('id'));
			$dw.find('i').attr('class', activeDw ? 'fa fa-heart' : 'fa fa-heart-o');
			$dw.contents().last()[0].textContent = activeDw ? ' browse wishlist' : ' add to wishlist';
		}
	}

	/* ---------------- Slick init helpers ---------------- */

	function destroySlick($el) {
		if ($el.hasClass('slick-initialized')) $el.slick('unslick');
	}

	function initProductsSlick($el, navSel) {
		destroySlick($el);
		$el.slick({
			slidesToShow: 4,
			slidesToScroll: 1,
			autoplay: true,
			infinite: true,
			speed: 300,
			dots: false,
			arrows: true,
			appendArrows: navSel ? $(navSel) : false,
			responsive: [
				{ breakpoint: 991, settings: { slidesToShow: 2, slidesToScroll: 1 } },
				{ breakpoint: 480, settings: { slidesToShow: 1, slidesToScroll: 1 } }
			]
		});
	}

	function initWidgetSlick($el, navSel) {
		destroySlick($el);
		$el.slick({
			infinite: true,
			autoplay: true,
			speed: 300,
			dots: false,
			arrows: true,
			appendArrows: navSel ? $(navSel) : false
		});
	}

	/* ---------------- Countdown ---------------- */

	function initCountdown() {
		var $cd = $('#hot-deal-countdown');
		if (!$cd.length) return;

		// Deadline: upcoming Sunday 23:59:59
		var now = new Date();
		var target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((7 - now.getDay()) % 7 || 7), 23, 59, 59);

		function tick() {
			var diff = Math.max(0, target - new Date());
			var days = Math.floor(diff / 86400000);
			var hours = Math.floor(diff / 3600000) % 24;
			var mins = Math.floor(diff / 60000) % 60;
			var secs = Math.floor(diff / 1000) % 60;
			$cd.find('[data-cd="days"]').text(days < 10 ? '0' + days : days);
			$cd.find('[data-cd="hours"]').text(hours < 10 ? '0' + hours : hours);
			$cd.find('[data-cd="mins"]').text(mins < 10 ? '0' + mins : mins);
			$cd.find('[data-cd="secs"]').text(secs < 10 ? '0' + secs : secs);
		}
		tick();
		setInterval(tick, 1000);
	}

	/* ================= PAGE: INDEX ================= */

	function initIndexPage() {
		function byRating(a, b) { return b.rating - a.rating || b.reviews - a.reviews; }

		function getList(type, cat) {
			var list = PRODUCTS.slice();
			if (cat) {
				list = list.filter(function (p) { return p.category === cat; });
			} else if (type === 'new') {
				list = list.filter(function (p) { return p.isNew; });
				if (list.length < 4) list = PRODUCTS.slice(0, 5);
			} else {
				list.sort(byRating);
				list = list.slice(0, 5);
			}
			return list;
		}

		function renderSection($tabs) {
			var cat = $tabs.find('li.active a').data('cat') || '';
			var type = $tabs.data('type');
			var $carousel = $($tabs.data('carousel'));
			var nav = $tabs.data('nav');
			destroySlick($carousel);
			$carousel.html(getList(type, cat).map(productInnerHTML).join(''));
			initProductsSlick($carousel, nav);
		}

		$('.home-tabs a').on('click', function (e) {
			e.preventDefault();
			var $li = $(this).closest('li');
			var $tabs = $li.closest('.home-tabs');
			$tabs.find('li').removeClass('active');
			$li.addClass('active');
			renderSection($tabs);
		});

		$('.home-tabs').each(function () { renderSection($(this)); });

		// Top-selling widget columns (3 columns x 2 slides x 3 widgets)
		var sorted = PRODUCTS.slice().sort(byRating);
		$('.products-widget-slick').each(function (idx) {
			var $el = $(this);
			var nav = $el.data('nav');
			var chunk = sorted.slice(idx * 6, idx * 6 + 6);
			while (chunk.length < 6) chunk = chunk.concat(sorted.slice(0, 6 - chunk.length));
			var html = '<div>' + chunk.slice(0, 3).map(productWidgetHTML).join('') + '</div>' +
			           '<div>' + chunk.slice(3, 6).map(productWidgetHTML).join('') + '</div>';
			destroySlick($el);
			$el.html(html);
			initWidgetSlick($el, nav);
		});
	}

	/* ================= PAGE: STORE ================= */

	function initStorePage() {
		var state = {
			cats: [],
			brands: [],
			min: 1,
			max: 999,
			sort: 'popular',
			perPage: 9,
			page: 1,
			q: '',
			hot: getUrlParam('filter') === 'hot',
			wish: getUrlParam('wishlist') === '1'
		};

		var searchParam = getUrlParam('search');
		if (searchParam) state.q = searchParam.trim().toLowerCase();
		var catParam = getUrlParam('category');
		if (catParam && getAllCategories().indexOf(catParam) !== -1) state.cats = [catParam];
		var brandParam = getUrlParam('brand');
		if (brandParam && getAllBrands().indexOf(brandParam) !== -1) state.brands = [brandParam];

		/* --- Breadcrumb --- */
		var crumbLabel = 'All Categories';
		if (state.wish) crumbLabel = 'My Wishlist';
		else if (state.hot) crumbLabel = 'Hot Deals';
		else if (searchParam) crumbLabel = 'Search: "' + searchParam + '"';
		else if (state.cats.length) crumbLabel = state.cats[0];

		var $tree = $('#breadcrumb-tree');
		if ($tree.length) {
			$tree.html(
				'<li><a href="index.html">Home</a></li>' +
				'<li><a href="store.html">All Categories</a></li>' +
				(state.cats.length && !state.wish && !state.hot && !searchParam
					? '<li><a href="store.html">' + crumbLabel + '</a></li>'
					: '') +
				'<li class="active"><span id="breadcrumb-count"></span></li>'
			);
		}

		/* --- Category checkboxes --- */
		$('.checkbox-filter input[data-cat]').each(function () {
			var cat = $(this).data('cat');
			var count = PRODUCTS.filter(function (p) { return p.category === cat; }).length;
			$(this).closest('.input-checkbox').find('small').text('(' + count + ')');
			if (state.cats.indexOf(cat) !== -1) $(this).prop('checked', true);
		});

		/* --- Brand checkboxes (dynamic) --- */
		var brandHtml = '';
		getAllBrands().forEach(function (brand, i) {
			var count = PRODUCTS.filter(function (p) { return p.brand === brand; }).length;
			brandHtml +=
				'<div class="input-checkbox">' +
					'<input type="checkbox" id="brand-' + i + '" data-brand="' + escAttr(brand) + '">' +
					'<label for="brand-' + i + '"><span></span>' + brand + ' <small>(' + count + ')</small></label>' +
				'</div>';
		});
		$('#brand-filter').html(brandHtml);

		$('#brand-filter input[data-brand]').each(function () {
			if (state.brands.indexOf($(this).data('brand')) !== -1) $(this).prop('checked', true);
		});

		/* --- Top selling aside widgets --- */
		var topSellers = PRODUCTS.slice().sort(function (a, b) { return b.rating - a.rating || b.reviews - a.reviews; }).slice(0, 3);
		$('#aside-top-selling').html(topSellers.map(productWidgetHTML).join(''));

		/* --- Price slider --- */
		var sliderEl = document.getElementById('price-slider');
		if (sliderEl && sliderEl.noUiSlider) {
			sliderEl.noUiSlider.on('update', function (values) {
				state.min = Math.round(parseFloat(values[0]));
				state.max = Math.round(parseFloat(values[1]));
				apply();
			});
		}

		/* --- Filter events --- */
		$(document).on('change', '.checkbox-filter input[data-cat]', function () {
			state.cats = $('.checkbox-filter input[data-cat]:checked').map(function () { return $(this).data('cat'); }).get();
			state.page = 1;
			apply();
		});

		$(document).on('change', '#brand-filter input[data-brand]', function () {
			state.brands = $('#brand-filter input[data-brand]:checked').map(function () { return $(this).data('brand'); }).get();
			state.page = 1;
			apply();
		});

		$('#sort-select').on('change', function () {
			state.sort = $(this).val();
			state.page = 1;
			apply();
		});

		$('#show-select').on('change', function () {
			state.perPage = parseInt($(this).val(), 10) || 9;
			state.page = 1;
			apply();
		});

		$('.store-grid li').on('click', function () {
			$('.store-grid li').removeClass('active');
			$(this).addClass('active');
			$('#store-products').toggleClass('list-view', $(this).data('view') === 'list');
		});

		$(document).on('click', '#store-pagination a[data-page]', function (e) {
			e.preventDefault();
			state.page = parseInt($(this).data('page'), 10);
			apply();
			$('html,body').animate({ scrollTop: $('#store').offset().top - 40 }, 300);
		});

		/* --- Filtering engine --- */
		function filtered() {
			var list = PRODUCTS.filter(function (p) {
				if (state.wish && !isWishlisted(p.id)) return false;
				if (state.hot && !p.hotDeal) return false;
				if (state.cats.length && state.cats.indexOf(p.category) === -1) return false;
				if (state.brands.length && state.brands.indexOf(p.brand) === -1) return false;
				if (p.price < state.min || p.price > state.max) return false;
				if (state.q) {
					var hay = (p.name + ' ' + p.category + ' ' + p.brand).toLowerCase();
					if (hay.indexOf(state.q) === -1) return false;
				}
				return true;
			});

			switch (state.sort) {
				case 'price-asc': list.sort(function (a, b) { return a.price - b.price; }); break;
				case 'price-desc': list.sort(function (a, b) { return b.price - a.price; }); break;
				case 'name': list.sort(function (a, b) { return a.name.localeCompare(b.name); }); break;
				case 'newest': list.sort(function (a, b) { return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0); }); break;
				default: list.sort(function (a, b) { return b.rating - a.rating || b.reviews - a.reviews; });
			}
			return list;
		}

		function apply() {
			var list = filtered();
			var total = list.length;
			var totalPages = Math.max(1, Math.ceil(total / state.perPage));
			if (state.page > totalPages) state.page = totalPages;

			var start = (state.page - 1) * state.perPage;
			var pageItems = list.slice(start, start + state.perPage);

			var $grid = $('#store-products');
			if (!total) {
				$grid.html('<div class="col-md-12"><p class="order-empty"><i class="fa fa-search"></i> No products found matching your criteria.<br><br><a href="store.html" class="primary-btn cta-btn">Reset filters</a></p></div>');
			} else {
				$grid.html(pageItems.map(function (p) { return productCardHTML(p, 'col-md-4 col-xs-6'); }).join(''));
			}

			$('#breadcrumb-count').text(crumbLabel + ' (' + total + ' product' + (total === 1 ? '' : 's') + ')');

			var rangeText = total ? 'Showing ' + (start + 1) + '-' + (start + pageItems.length) + ' of ' + total + ' products' : 'Showing 0 products';
			$('#store-count').text(rangeText);

			// Pagination
			var pagHtml = '';
			for (var i = 1; i <= totalPages; i++) {
				pagHtml += i === state.page
					? '<li class="active">' + i + '</li>'
					: '<li><a href="#" data-page="' + i + '">' + i + '</a></li>';
			}
			$('#store-pagination').html(pagHtml);

			refreshHeader();
		}

		apply();
	}

	/* ================= PAGE: PRODUCT ================= */

	function initProductPage() {
		var id = parseInt(getUrlParam('id'), 10);
		var p = getProductById(id);
		if (!p) { window.location.href = 'store.html'; return; }

		document.title = p.name + ' - Electro';

		/* Breadcrumb */
		$('#breadcrumb-tree').html(
			'<li><a href="index.html">Home</a></li>' +
			'<li><a href="store.html">All Categories</a></li>' +
			'<li><a href="store.html?category=' + encodeURIComponent(p.category) + '">' + p.category + '</a></li>' +
			'<li class="active">' + p.name + '</li>'
		);

		/* Reviews */
		var reviews = getReviews(p.id);

		/* Details */
		$('#pd-name').text(p.name);
		$('#pd-rating').html(starsHTML(p.rating));
		$('#pd-review-link').html(reviews.length + ' Review(s) | Add your review');
		$('#pd-price').html(money(p.price) + ' <del class="product-old-price">' + money(p.oldPrice) + '</del>');
		$('#pd-description').text(p.description);
		$('#tab-description').text(p.description);
		$('#d-brand').text(p.brand);
		$('#d-category').text(p.category);
		$('#pd-categories').html(
			'<li>Category:</li>' +
			'<li><a href="store.html?category=' + encodeURIComponent(p.category) + '">' + p.category + '</a></li>' +
			'<li><a href="store.html?brand=' + encodeURIComponent(p.brand) + '">' + p.brand + '</a></li>'
		);
		$('.add-to-cart .add-to-cart-btn').attr('data-id', p.id);
		$('#detail-wishlist').attr('data-id', p.id);
		$('#detail-compare').attr('data-id', p.id);

		/* Gallery */
		var mainHtml = p.images.map(function (src) {
			return '<div class="product-preview"><img src="' + src + '" alt="' + escAttr(p.name) + '"></div>';
		}).join('');

		var $main = $('#product-main-img');
		var $thumbs = $('#product-imgs');
		destroySlick($main);
		destroySlick($thumbs);

		$('#product-main-img').html(mainHtml);
		$('#product-imgs').html(mainHtml);

		$main.slick({
			infinite: true, speed: 300, dots: false, arrows: true, fade: true,
			asNavFor: '#product-imgs'
		});
		$thumbs.slick({
			slidesToShow: 3, slidesToScroll: 1, arrows: true, centerMode: true,
			focusOnSelect: true, centerPadding: 0, vertical: true,
			asNavFor: '#product-main-img',
			responsive: [{ breakpoint: 991, settings: { vertical: false, arrows: false, dots: true } }]
		});
		$('#product-main-img .product-preview').zoom();

		/* Related products */
		var related = PRODUCTS.filter(function (x) { return x.category === p.category && x.id !== p.id; });
		if (related.length < 4) {
			PRODUCTS.forEach(function (x) {
				if (related.length < 4 && x.id !== p.id && related.indexOf(x) === -1) related.push(x);
			});
		}
		$('#related-products').html(related.slice(0, 4).map(function (x) {
			return productCardHTML(x, 'col-md-3 col-xs-6');
		}).join(''));

		function renderReviews() {
			reviews = getReviews(p.id);
			var total = reviews.length;
			var avg = total ? reviews.reduce(function (s, r) { return s + r.rating; }, 0) / total : 0;

			$('#rating-avg-num').text(avg.toFixed(1));
			$('#rating-avg-stars').html(starsHTML(Math.round(avg)));

			var distHtml = '';
			for (var star = 5; star >= 1; star--) {
				var count = reviews.filter(function (r) { return r.rating === star; }).length;
				var pct = total ? Math.round(count / total * 100) : 0;
				distHtml +=
					'<li>' +
						'<div class="rating-stars">' + starsHTML(star) + '</div>' +
						'<div class="rating-progress"><div style="width: ' + pct + '%;"></div></div>' +
						'<span class="sum">' + count + '</span>' +
					'</li>';
			}
			$('#rating-dist').html(distHtml);

			$('#reviews-list').html(reviews.map(function (r) {
				return '' +
					'<li>' +
						'<div class="review-heading">' +
							'<h5 class="name">' + r.name + '</h5>' +
							'<p class="date">' + r.date + '</p>' +
							'<div class="review-rating">' + starsHTML(r.rating) + '</div>' +
						'</div>' +
						'<div class="review-body"><p>' + r.text + '</p></div>' +
					'</li>';
			}).join(''));

			$('#tab3-label').text('Reviews (' + total + ')');
			$('#pd-review-link').html(total + ' Review(s) | Add your review');
		}
		renderReviews();

		/* Review form */
		$('.review-form').on('submit', function (e) {
			e.preventDefault();
			var name = $(this).find('input[type="text"]').val().trim();
			var email = $(this).find('input[type="email"]').val().trim();
			var text = $(this).find('textarea').val().trim();
			var rating = parseInt($(this).find('input[name="rating"]:checked').val(), 10);

			if (!name || !email || email.indexOf('@') === -1 || !text || !rating) {
				toast('Please fill all fields and pick a rating');
				return;
			}
			addReview(p.id, { name: name, date: formatDate(new Date()), rating: rating, text: text });
			this.reset();
			renderReviews();
			toast('Thanks! Your review was posted');
			$('.tab-nav a[href="#p-tab3"]').click();
		});

		/* Jump to reviews */
		$('#pd-review-link').on('click', function (e) {
			e.preventDefault();
			$('.tab-nav a[href="#p-tab3"]').click();
		});
	}

	/* ================= PAGE: CHECKOUT ================= */

	function initCheckoutPage() {
		var REQUIRED_FIELDS = ['first-name', 'last-name', 'email', 'address', 'city', 'country', 'zip-code', 'tel'];

		function renderOrder() {
			var cart = getCart();
			var $ops = $('.order-products');
			if (!cart.length) {
				$ops.html('<p class="order-empty"><i class="fa fa-shopping-cart"></i> Your cart is empty.<br>Add some products first!</p>');
			} else {
				$ops.html(cart.map(function (item) {
					var prod = getProductById(item.id);
					if (!prod) return '';
					return '' +
						'<div class="order-col cart-order-item">' +
							'<div class="cart-order-product">' +
								'<img src="' + prod.img + '" alt="' + escAttr(prod.name) + '">' +
								'<span>' + prod.name + '</span>' +
							'</div>' +
							'<div class="cart-order-controls">' +
								'<button type="button" class="cart-qty-btn" data-id="' + prod.id + '" data-change="-1" aria-label="Decrease quantity">-</button>' +
								'<input class="cart-qty-input" type="number" min="1" max="99" value="' + item.qty + '" data-id="' + prod.id + '" aria-label="Quantity for ' + escAttr(prod.name) + '">' +
								'<button type="button" class="cart-qty-btn" data-id="' + prod.id + '" data-change="1" aria-label="Increase quantity">+</button>' +
								'<strong>' + money(prod.price * item.qty) + '</strong>' +
								'<button type="button" class="cart-remove-btn" data-id="' + prod.id + '" aria-label="Remove ' + escAttr(prod.name) + '"><i class="fa fa-trash"></i></button>' +
							'</div>' +
						'</div>';
				}).join(''));
			}
			$('.order-total').text(money(cartSubtotal()));
		}
		renderOrder();

		$(document).on('click', '.cart-qty-btn', function () {
			var id = parseInt($(this).data('id'), 10);
			var current = parseInt($(this).siblings('.cart-qty-input').val(), 10) || 1;
			setCartQty(id, Math.min(99, Math.max(1, current + parseInt($(this).data('change'), 10))));
			renderOrder();
		});

		$(document).on('change', '.cart-qty-input', function () {
			var id = parseInt($(this).data('id'), 10);
			setCartQty(id, Math.min(99, Math.max(1, parseInt($(this).val(), 10) || 1)));
			renderOrder();
		});

		$(document).on('click', '.cart-remove-btn', function () {
			removeFromCart($(this).data('id'));
			renderOrder();
		});

		/* Track-order mode */
		if (getUrlParam('track') === '1') {
			var order = getLastOrder();
			var $section = $('#checkout-section .container');
			if (order) {
				$section.html(
					'<div class="row"><div class="col-md-8 col-md-offset-2">' +
						'<div class="section-title text-center"><h3 class="title">Track My Order</h3></div>' +
						'<div class="order-summary">' +
							'<div class="order-col"><div><strong>Order Number</strong></div><div>' + order.number + '</div></div>' +
							'<div class="order-col"><div><strong>Placed On</strong></div><div>' + order.date + '</div></div>' +
							'<div class="order-col"><div><strong>Items</strong></div><div>' + order.items + '</div></div>' +
							'<div class="order-col"><div><strong>Total</strong></div><div><strong>' + money(order.total) + '</strong></div></div>' +
						'</div>' +
						'<ul class="track-steps">' +
							'<li class="done"><i class="fa fa-check-circle"></i>Order placed</li>' +
							'<li class="done"><i class="fa fa-check-circle"></i>Payment confirmed</li>' +
							'<li><i class="fa fa-circle-o"></i>Processing / packing</li>' +
							'<li><i class="fa fa-circle-o"></i>Shipped</li>' +
							'<li><i class="fa fa-circle-o"></i>Delivered</li>' +
						'</ul>' +
						'<a href="index.html" class="primary-btn cta-btn">Continue Shopping</a> ' +
						'<a href="checkout.html" class="primary-btn cta-btn" style="background:#e4e7ed;color:#15161d;">Back to Checkout</a>' +
					'</div></div>'
				);
			} else {
				$section.html(
					'<div class="row"><div class="col-md-8 col-md-offset-2 text-center">' +
						'<div class="section-title"><h3 class="title">Track My Order</h3></div>' +
						'<p class="order-empty"><i class="fa fa-truck"></i><br>No orders found yet. Place an order first!</p>' +
						'<a href="store.html" class="primary-btn cta-btn">Go to Store</a>' +
					'</div></div>'
				);
			}
			return;
		}

		/* Place order */
		$('.order-submit').on('click', async function (e) {
			e.preventDefault();
			var cart = getCart();
			var errors = [];

			$('.billing-details .input').removeClass('input-error');

			if (!cart.length) {
				errors.push('Your cart is empty.');
			}

			REQUIRED_FIELDS.forEach(function (fieldName) {
				var $field = $('.billing-details input[name="' + fieldName + '"]');
				if (!$field.val() || !$field.val().trim()) {
					$field.addClass('input-error');
					errors.push('Please enter your ' + fieldName.replace('-', ' ') + '.');
				}
			});

			var email = $('.billing-details input[name="email"]').val() || '';
			if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
				errors.push('Please enter a valid email address.');
			}

			var zip = $('.billing-details input[name="zip-code"]').val() || '';
			if (zip && !/^\d{4,10}$/.test(zip.trim())) {
				errors.push('Please enter a valid ZIP code.');
			}

			var telephone = $('.billing-details input[name="tel"]').val() || '';
			if (telephone && !/^[+\d][\d\s()-]{6,}$/.test(telephone.trim())) {
				errors.push('Please enter a valid telephone number.');
			}

			if (!$('#terms').is(':checked')) {
				errors.push('You must accept the terms & conditions.');
			}

			if (!$('input[name="payment"]:checked').length) {
				errors.push('Please select a payment method.');
			}

			var $errBox = $('#checkout-error');
			if (errors.length) {
				$errBox.html('<strong>Please fix the following:</strong><br>- ' + errors.join('<br>- ')).slideDown();
				$('html,body').animate({ scrollTop: $errBox.offset().top - 120 }, 300);
				return;
			}
			$errBox.hide();

			if ($('input[name="payment"]:checked').attr('id') === 'payment-4') {
				try {
					var checkout = await window.PaymongoGcash.startCheckout({
						name: ($('.billing-details input[name="first-name"]').val() + ' ' + $('.billing-details input[name="last-name"]').val()).trim(),
						email: email.trim(),
						phone: telephone.trim(),
						amount: cartSubtotal(),
						returnUrl: window.location.origin + window.location.pathname
					});
					if (checkout.qrImageUrl) {
						$('#checkout-section .container').html(
							'<div class="row"><div class="col-md-8 col-md-offset-2 text-center">' +
							'<div class="section-title"><h3 class="title">Scan to pay with GCash</h3></div>' +
							'<p>Open GCash and scan this QR code to complete your payment.</p>' +
							'<img id="paymongo-qr" alt="PayMongo QR payment code" style="max-width:420px;width:100%;padding:16px;background:#fff;border:1px solid #e4e7ed;" />' +
							'<p style="margin-top:20px;"><a href="checkout.html" class="primary-btn cta-btn">Return to Checkout</a></p>' +
							'</div></div>'
						);
						$('#paymongo-qr').attr('src', checkout.qrImageUrl);
						return;
					}
					window.location.href = checkout.checkoutUrl;
					return;
				} catch (error) {
					$errBox.text(error.message || 'Unable to start GCash payment.').slideDown();
					return;
				}
			}

			var orderNumber = 'EL-' + Math.floor(100000 + Math.random() * 900000);
			var order = {
				number: orderNumber,
				date: formatDate(new Date()),
				items: cartCount(),
				total: cartSubtotal()
			};
			writeStore(ORDER_KEY, order);
			clearCart();

			$('#checkout-section .container').html(
				'<div class="row"><div class="col-md-8 col-md-offset-2 text-center">' +
					'<div class="section-title"><h3 class="title"><i class="fa fa-check-circle" style="color:#4bb765;"></i> Order Placed Successfully!</h3></div>' +
					'<div class="order-summary">' +
						'<div class="order-col"><div><strong>Order Number</strong></div><div>' + order.number + '</div></div>' +
						'<div class="order-col"><div><strong>Date</strong></div><div>' + order.date + '</div></div>' +
						'<div class="order-col"><div><strong>Items</strong></div><div>' + order.items + '</div></div>' +
						'<div class="order-col"><div><strong>TOTAL</strong></div><div><strong>' + money(order.total) + '</strong></div></div>' +
					'</div>' +
					'<p style="margin:20px 0;">Thank you for your purchase! A confirmation email is on its way.</p>' +
					'<a href="index.html" class="primary-btn cta-btn">Continue Shopping</a> ' +
					'<a href="checkout.html?track=1" class="primary-btn cta-btn" style="background:#e4e7ed;color:#15161d;">Track My Order</a>' +
				'</div></div>'
			);
		});
	}

	/* ================= PAGE: INFO (blank.html) ================= */

	var INFO_PAGES = {
		about:    { title: 'About Us', body: '<p>Electro is your one-stop online store for the latest laptops, smartphones, cameras and accessories. We offer top brands at unbeatable prices with fast, free shipping on every order.</p><p>Our mission is simple: bring cutting-edge technology to everyone, backed by friendly customer support and hassle-free returns.</p>' },
		contact:  { title: 'Contact Us', body: '<p>We would love to hear from you!</p><p><i class="fa fa-phone"></i> Phone: +021-95-51-84<br><i class="fa fa-envelope-o"></i> Email: <a href="mailto:email@email.com">email@email.com</a><br><i class="fa fa-map-marker"></i> Address: 1734 Stonecoal Road</p><p>Support hours: Monday - Saturday, 9AM - 6PM.</p>' },
		privacy:  { title: 'Privacy Policy', body: '<p>Your privacy matters to us. We only collect the information needed to process your orders and improve your shopping experience.</p><p>We never sell your personal data to third parties. Payment details are processed securely and are never stored on our servers.</p>' },
		returns:  { title: 'Orders and Returns', body: '<p>Every order can be tracked from your account. Once your order ships you will receive a confirmation email with tracking details.</p><p>Not happy with your purchase? Return any item within 30 days for a full refund - no questions asked. Items must be in original condition.</p>' },
		terms:    { title: 'Terms & Conditions', body: '<p>By placing an order with Electro you agree to our terms of service. All prices are listed in Philippine Peso (PHP) and include applicable taxes.</p><p>We accept GCash, direct bank transfer, cheque and PayPal. Products are covered by the manufacturer warranty. Delivery estimates are provided at checkout and may vary by region.</p>' },
		help:     { title: 'Help Center', body: '<p>Need assistance? Browse the topics below:</p><p>- How do I place an order? Add items to your cart and proceed to checkout.<br>- How do I track my order? Use the "Track My Order" link in the footer.<br>- How do I return an item? See "Orders and Returns" for our 30-day policy.</p><p>Still stuck? <a href="mailto:email@email.com">Email our support team</a>.</p>' },
		account:  { title: 'My Account', body: '' }
	};

	function initInfoPage() {
		var key = getUrlParam('page') || 'about';
		var info = INFO_PAGES[key] || INFO_PAGES.about;
		$('.breadcrumb-header').text(info.title);
		$('#breadcrumb-tree').html('<li><a href="index.html">Home</a></li><li class="active">' + info.title + '</li>');
		if (key === 'account' && !ElectroAuth.isLoggedIn()) {
			$('#info-content').html(
				'<div class="account-login">' +
					'<h3>My Account</h3><p>You need to log in before adding products to your cart.</p>' +
					'<a href="login.html?return=index.html" class="primary-btn cta-btn">Login</a> ' +
					'<a href="register.html?return=index.html" class="primary-btn cta-btn" style="background:#e4e7ed;color:#15161d;">Register</a>' +
				'</div>'
			);
		} else if (key === 'account') {
			$('#info-content').html(
				'<p>You are logged in.</p><p>From here you can view your cart, check your wishlist, and track recent orders:</p>' +
				'<p><a href="checkout.html" class="primary-btn cta-btn">View Cart</a> <a href="store.html?wishlist=1" class="primary-btn cta-btn" style="background:#e4e7ed;color:#15161d;">My Wishlist</a> <a href="checkout.html?track=1" class="primary-btn cta-btn" style="background:#e4e7ed;color:#15161d;">Track My Order</a> <button type="button" id="logout-btn" class="primary-btn cta-btn" style="background:#e4e7ed;color:#15161d;">Logout</button></p>'
			);
		} else {
			$('#info-content').html(info.body);
		}
		document.title = info.title + ' - Electro';
	}

	/* ---------------- Global events ---------------- */

	function bindGlobalEvents() {

		// Add to cart (delegated - works for dynamically rendered cards)
		$(document).on('click', '.add-to-cart-btn', function (e) {
			e.preventDefault();
			if (!ElectroAuth.isLoggedIn()) {
				window.location.href = 'login.html?return=' + encodeURIComponent(window.location.pathname.split('/').pop() || 'index.html');
				return;
			}
			var id = $(this).data('id');
			if (!id) return;
			var qty = 1;
			var $qtyInput = $(this).closest('.add-to-cart').find('input[type="number"]').first();
			if ($qtyInput.length) qty = parseInt($qtyInput.val(), 10) || 1;
			addToCart(id, qty);
			toast('Added to cart!');
		});

		// Remove from cart (header dropdown)
		$(document).on('click', '.cart-dropdown .delete', function (e) {
			e.stopPropagation();
			removeFromCart($(this).data('id'));
			toast('Removed from cart');
		});

		// Wishlist toggle
		$(document).on('click', '.add-to-wishlist', function (e) {
			e.preventDefault();
			var id = $(this).data('id');
			if (!id) return;
			var added = toggleWishlist(id);
			toast(added ? 'Added to wishlist!' : 'Removed from wishlist');
		});

		// Detail page wishlist link
		$(document).on('click', '#detail-wishlist', function (e) {
			e.preventDefault();
			var id = $(this).data('id');
			if (!id) return;
			var added = toggleWishlist(id);
			toast(added ? 'Added to wishlist!' : 'Removed from wishlist');
		});

		// Quick view -> product page
		$(document).on('click', '.quick-view', function (e) {
			e.preventDefault();
			var id = $(this).data('id');
			if (id) window.location.href = 'product.html?id=' + id;
		});

		// Compare toggle
		$(document).on('click', '.add-to-compare, #detail-compare', function (e) {
			e.preventDefault();
			$(this).toggleClass('active');
			toast($(this).hasClass('active') ? 'Added to compare' : 'Removed from compare');
		});

		// Search
		$(document).on('submit', '.header-search form', function (e) {
			e.preventDefault();
			var q = $(this).find('input.input').val().trim();
			var cat = $(this).find('select.input-select').val();
			var url = 'store.html' + (q ? '?search=' + encodeURIComponent(q) : '');
			if (cat && cat !== '0') {
				url += (url.indexOf('?') === -1 ? '?' : '&') + 'category=' + encodeURIComponent(cat);
			}
			window.location.href = url;
		});

		// Newsletter
		$(document).on('submit', '#newsletter form', function (e) {
			e.preventDefault();
			var email = $(this).find('input[type="email"]').val().trim();
			if (!email || email.indexOf('@') === -1) {
				toast('Please enter a valid email address');
				return;
			}
			$(this).html('<p class="newsletter-success"><i class="fa fa-check-circle"></i> Thanks for subscribing, ' + email + '!</p>');
		});
	}

	/* ---------------- Boot ---------------- */

	$(function () {
		bindGlobalEvents();
		refreshHeader();
		initCountdown();

		switch (document.body.getAttribute('data-page')) {
			case 'index': initIndexPage(); break;
			case 'store': initStorePage(); break;
			case 'product': initProductPage(); break;
			case 'checkout': initCheckoutPage(); break;
			case 'info': initInfoPage(); break;
		}
	});

})(jQuery);