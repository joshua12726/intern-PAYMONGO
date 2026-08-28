/* ============================================================
   ELECTRO - Login and Registration
   ============================================================ */

(function ($) {
	"use strict";

	var AUTH_KEY = 'electro_logged_in';
	var USER_KEY = 'electro_user';

	function read(key, fallback) {
		try {
			var value = localStorage.getItem(key);
			return value ? JSON.parse(value) : fallback;
		} catch (e) {
			return fallback;
		}
	}

	function write(key, value) {
		try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
	}

	function returnPage() {
		var match = /[?&]return=([^&#]*)/.exec(window.location.href);
		return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : 'index.html';
	}

	function firebaseReady() {
		return window.firebaseReadyPromise || Promise.reject(new Error('Firebase is not available.'));
	}

	function firebaseMessage(error) {
		var messages = {
			'auth/email-already-in-use': 'This Gmail address is already registered.',
			'auth/invalid-credential': 'Email or password is incorrect.',
			'auth/too-many-requests': 'Too many attempts. Please try again later.'
		};
		return messages[error.code] || 'Unable to complete the request. Please try again.';
	}

	window.ElectroAuth = {
		isLoggedIn: function () {
			return read(AUTH_KEY, null) !== null;
		}
	};

	$(function () {
		var page = document.body.getAttribute('data-page');
		if ((page === 'login' || page === 'register') && ElectroAuth.isLoggedIn()) {
			window.location.href = returnPage();
			return;
		}

		$(document).on('submit', '#login-form', function (e) {
			e.preventDefault();
			var form = this;
			var email = $('#login-email').val().trim().toLowerCase();
			var password = $('#login-password').val();
			var errors = [];

			if (!/^[^\s@]+@gmail\.com$/.test(email)) errors.push('Enter a valid Gmail address.');
			if (password.length < 6) errors.push('Password must be at least 6 characters.');
			if (errors.length) {
				$('#login-error').html(errors.join('<br>')).slideDown();
				return;
			}

			$(form).find('button[type="submit"]').prop('disabled', true);
			firebaseReady().then(function (auth) {
				return window.firebaseSignIn(auth, email, password);
			}).then(function (result) {
				if (!result.user.emailVerified) {
					return window.firebaseSignOut(window.firebaseAuth).then(function () {
						throw new Error('Please verify your email using the link sent to your Gmail before logging in.');
					});
				}
				write(AUTH_KEY, { email: email });
				window.location.href = returnPage();
			}).catch(function (error) {
				$('#login-error').text(error.message.indexOf('Please verify') === 0 ? error.message : firebaseMessage(error)).slideDown();
				$(form).find('button[type="submit"]').prop('disabled', false);
			});
		});

		$(document).on('submit', '#register-form', function (e) {
			e.preventDefault();
			var form = this;
			var name = $('#register-name').val().trim();
			var email = $('#register-email').val().trim().toLowerCase();
			var phone = $('#register-phone').val().trim();
			var password = $('#register-password').val();
			var confirmation = $('#register-confirm-password').val();
			var errors = [];

			if (!name) errors.push('Enter your name.');
			if (!/^[^\s@]+@gmail\.com$/.test(email)) errors.push('Enter a valid Gmail address.');
			if (!/^\+?[0-9][0-9\s()-]{7,14}$/.test(phone)) errors.push('Enter a valid phone number.');
			if (password.length < 6) errors.push('Password must be at least 6 characters.');
			if (password !== confirmation) errors.push('Passwords do not match.');
			if (errors.length) {
				$('#register-error').html(errors.join('<br>')).slideDown();
				return;
			}

			$(form).find('button[type="submit"]').prop('disabled', true);
			firebaseReady().then(function (auth) {
				return window.firebaseCreateUser(auth, email, password);
			}).then(function (result) {
				return window.firebaseSendEmailVerification(result.user).then(function () {
					return window.firebaseSignOut(window.firebaseAuth);
				});
			}).then(function () {
				alert('Registration successful! Please press the verification link sent to your Gmail before logging in.');
				window.location.href = 'login.html';
			}).catch(function (error) {
				$('#register-error').text(firebaseMessage(error)).slideDown();
				$(form).find('button[type="submit"]').prop('disabled', false);
			});
		});

		$(document).on('click', '#logout-btn', function () {
			try { localStorage.removeItem(AUTH_KEY); } catch (e) { /* storage unavailable */ }
			window.location.href = 'blank.html?page=account';
		});
	});
})(jQuery);
