/* ============================================================
   ELECTRO - Product Catalog
   All products used across the site are defined here.
   ============================================================ */

var PRODUCTS = [
	{
		id: 1,
		name: 'Laptop v3 600cc',
		category: "Laptops",
		brand: "Apple",
		price: 1.00,
		oldPrice: 1.00,
		rating: 5,
		reviews: 12,
		img: "img/product01.png",
		images: ["img/product01.png", "img/product04.png", "img/product07.png"],
		isNew: true,
		hotDeal: false,
		description: 'The MacBook Pro 13" with Retina display packs incredible performance into a slim, lightweight design. Featuring a brilliant Retina display, all-day battery life and a responsive keyboard, it is the perfect laptop for work and play.'
	},
	{
		id: 2,
		name: 'Lenovo IdeaPad 330 15.6" Laptop',
		category: "Acce",
		brand: "Lenovo",
		price: 1.00,
		oldPrice: 1.00,
		rating: 4,
		reviews: 8,
		img: "img/product02.png",
		images: ["img/product02.png", "img/product05.png", "img/product08.png"],
		isNew: false,
		hotDeal: true,
		description: "The Lenovo IdeaPad 330 delivers powerful performance and reliability at an affordable price. With a 15.6-inch HD display, fast processor and ample storage, it handles everyday computing tasks with ease."
	},
	{
		id: 3,
		name: 'HP Pavilion x360 14" Touch Laptop',
		category: "Laptops",
		brand: "HP",
		price: 1.00,
		oldPrice: 1.00,
		rating: 4,
		reviews: 6,
		img: "img/product03.png",
		images: ["img/product03.png", "img/product06.png", "img/product09.png"],
		isNew: false,
		hotDeal: false,
		description: "The HP Pavilion x360 is a versatile convertible laptop with a 14-inch touchscreen that rotates 360 degrees. Switch between laptop, tent, stand and tablet modes to fit whatever you are doing."
	},
	{
		id: 4,
		name: 'Samsung super Galaxy 10000GB',
		category: "Smartphones",
		brand: "Samsung",
		price: 1.00,
		oldPrice: 1.00,
		rating: 5,
		reviews: 15,
		img: "img/product04.png",
		images: ["img/product04.png", "img/product01.png", "img/product07.png"],
		isNew: true,
		hotDeal: false,
		description: "The Samsung Galaxy S9+ features a stunning Infinity Display, dual aperture camera for amazing low-light photos and stereo speakers tuned by AKG. Unlock with Intelligent Scan or iris recognition."
	},
	{
		id: 5,
		name: "Headset homot kaayo wala na gamit ",
		category: "Accessories",
		brand: "Apple",
		price: 1.00,
		oldPrice: 1.00,
		rating: 5,
		reviews: 21,
		img: "img/product05.png",
		images: ["img/product05.png", "img/product02.png", "img/product08.png"],
		isNew: false,
		hotDeal: true,
		description: "iPhone X features a Super Retina 5.8-inch OLED display, Face ID facial recognition and an A11 Bionic chip. The dual 12MP cameras with Portrait mode take studio-quality photos."
	},
	{
		id: 6,
		name: "LG G7 ThinQ 64GB Smartphone",
		category: "Smartphones",
		brand: "LG",
		price: 1.00,
		oldPrice: 1.00,
		rating: 3,
		reviews: 5,
		img: "img/product06.png",
		images: ["img/product06.png", "img/product03.png", "img/product09.png"],
		isNew: false,
		hotDeal: false,
		description: "The LG G7 ThinQ combines a bright 6.1-inch QHD+ display with AI-powered cameras and Boombox speaker technology for loud, rich sound without sacrificing battery life."
	},
	{
		id: 7,
		name: "Sony Alpha A6000 Mirrorless Camera",
		category: "Cameras",
		brand: "Sony",
		price: 1.00,
		oldPrice: 1.00,
		rating: 4,
		reviews: 9,
		img: "img/product07.png",
		images: ["img/product07.png", "img/product01.png", "img/product04.png"],
		isNew: false,
		hotDeal: true,
		description: "The Sony Alpha A6000 mirrorless camera delivers professional-quality photos with a 24.3MP APS-C sensor, hybrid autofocus with 179 focus points and continuous shooting up to 11fps."
	},
	{
		id: 8,
		name: "Laptop ra",
		category: "Laptops",
		brand: "Canon",
		price: 1.00,
		oldPrice: 1.00,
		rating: 4,
		reviews: 7,
		img: "img/product08.png",
		images: ["img/product08.png", "img/product02.png", "img/product05.png"],
		isNew: true,
		hotDeal: false,
		description: "The Canon EOS 4000D DSLR makes it easy to capture stunning photos and Full HD movies. With an 18MP sensor, Wi-Fi sharing and Scene Intelligent Auto mode, great shots are effortless."
	},
	{
		id: 9,
		name: "Nikon D3400 DSLR with 18-55mm Lens",
		category: "Cameras",
		brand: "Nikon",
		price: 1.00,
		oldPrice: 1.00,
		rating: 5,
		reviews: 11,
		img: "img/product09.png",
		images: ["img/product09.png", "img/product03.png", "img/product06.png"],
		isNew: false,
		hotDeal: true,
		description: "The Nikon D3400 with 18-55mm VR lens is the perfect entry-level DSLR. Its 24.2MP sensor captures sharp, detailed images while SnapBridge Bluetooth keeps your photos synced to your phone."
	},
	{
		id: 10,
		name: "Laptop bago ra",
		category: "Lap",
		brand: "Sony",
		price: 1.00,
		oldPrice: 1.00,
		rating: 5,
		reviews: 18,
		img: "img/product01.png",
		images: ["img/product01.png", "img/product05.png", "img/product09.png"],
		isNew: true,
		hotDeal: false,
		description: "Sony WH-1000XM2 wireless noise-cancelling headphones deliver industry-leading silence with smart listening by day and Adaptive Sound Control. Enjoy up to 30 hours of battery life."
	},
	{
		id: 11,
		name: "Samsung Galaxy Buds Wireless Earbuds",
		category: "Accessories",
		brand: "Samsung",
		price: 1.00,
		oldPrice: 1.00,
		rating: 4,
		reviews: 10,
		img: "img/product02.png",
		images: ["img/product02.png", "img/product06.png", "img/product08.png"],
		isNew: false,
		hotDeal: false,
		description: "Samsung Galaxy Buds offer crisp, rich sound in a compact truly-wireless design. With Ambient Sound mode and a pocket-sized charging case, they keep you connected on the go."
	},
	{
		id: 12,
		name: "Laptop Bago Laba",
		category: "Lapto",
		brand: "Logitech",
		price: 1.00,
		oldPrice: 1.00,
		rating: 5,
		reviews: 14,
		img: "img/product03.png",
		images: ["img/product03.png", "img/product07.png", "img/product01.png"],
		isNew: false,
		hotDeal: true,
		description: "The Logitech MX Master 2S is the flagship wireless mouse for power users. Track on any surface, switch between three devices and enjoy precision scrolling with speed-adaptive thumbwheel."
	}
];

/* Helper: find a product by id */
function getProductById(id) {
	id = parseInt(id, 10);
	for (var i = 0; i < PRODUCTS.length; i++) {
		if (PRODUCTS[i].id === id) return PRODUCTS[i];
	}
	return null;
}

/* Helper: get all distinct categories */
function getAllCategories() {
	var cats = [];
	for (var i = 0; i < PRODUCTS.length; i++) {
		if (cats.indexOf(PRODUCTS[i].category) === -1) cats.push(PRODUCTS[i].category);
	}
	return cats;
}

/* Helper: get all distinct brands */
function getAllBrands() {
	var brands = [];
	for (var i = 0; i < PRODUCTS.length; i++) {
		if (brands.indexOf(PRODUCTS[i].brand) === -1) brands.push(PRODUCTS[i].brand);
	}
	return brands.sort();
}