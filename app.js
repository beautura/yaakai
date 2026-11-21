const products = [
  { id: 'curry-leaf', name: 'Curry Leaf Thokku', category: 'Thokku', description: 'A delicious spoonful of home.', price: 249, tag: 'A HOUSE FAVOURITE', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80' },
  { id: 'honey-nuts', name: 'Honey Nuts', category: 'Honey & nuts', description: 'A little crunch, a little sweetness.', price: 399, tag: 'BEST LOVED', image: 'https://images.unsplash.com/photo-1471943311424-646960669fbc?auto=format&fit=crop&w=900&q=80' },
  { id: 'health-mix', name: 'Traditional Health Mix', category: 'Health mixes', description: 'Wholesome goodness in every sip.', price: 349, tag: 'EVERYDAY GOODNESS', image: 'https://images.unsplash.com/photo-1517093157656-b9eccef91cb1?auto=format&fit=crop&w=900&q=80' },
  { id: 'immunity-mix', name: 'Immunity Mix', category: 'Health mixes', description: 'A traditional pantry favourite.', price: 199, tag: 'PANTRY ESSENTIAL', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=80' },
  { id: 'honey', name: 'Golden Honey', category: 'Honey & nuts', description: 'Naturally sweet, simply lovely.', price: 299, tag: 'NATURALLY SWEET', image: 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?auto=format&fit=crop&w=900&q=80' },
  { id: 'masala-powders', name: 'Traditional Masala Powders', category: 'Health mixes', description: 'Familiar flavours for everyday cooking.', price: 229, tag: 'MADE WITH CARE', image: 'https://images.unsplash.com/photo-1532336414038-cf19250c5757?auto=format&fit=crop&w=900&q=80' }
];

const grid = document.querySelector('#product-grid');
const search = document.querySelector('#product-search');
const drawer = document.querySelector('.cart-drawer');
const overlay = document.querySelector('.drawer-overlay');
let category = 'All';
let cart = {};
try { cart = JSON.parse(localStorage.getItem('yaakai-cart')) || {}; } catch { cart = {}; }

function renderProducts() {
  const term = search.value.trim().toLowerCase();
  const visible = products.filter(product => (category === 'All' || product.category === category) && `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(term));
  grid.innerHTML = visible.map(product => `<article class="product-card"><div class="product-image-wrap"><img class="product-image" src="${product.image}" alt="${product.name}" loading="lazy"><span class="product-tag">${product.tag}</span></div><div class="product-meta"><div><span class="product-category">${product.category}</span><h3 class="product-title">${product.name}</h3><p class="product-description">${product.description}</p></div><span class="product-price">₹${product.price}</span><button class="add-button" data-add="${product.id}" aria-label="Add ${product.name} to bag">Add to Cart</button></div></article>`).join('');
  document.querySelector('.empty-products').hidden = visible.length > 0;
  if (window.lucide) lucide.createIcons();
}

function renderCart() {
  const items = products.filter(product => cart[product.id] > 0);
  const count = items.reduce((total, product) => total + cart[product.id], 0);
  const total = items.reduce((sum, product) => sum + product.price * cart[product.id], 0);
  document.querySelector('.bag-count').textContent = count;
  document.querySelector('#cart-total').textContent = `₹${total.toLocaleString('en-IN')}`;
  document.querySelector('.cart-items').innerHTML = items.length ? items.map(product => `<div class="cart-item"><img src="${product.image}" alt=""><div><h3>${product.name}</h3><p>₹${product.price}</p><div class="quantity"><button data-change="${product.id}" data-delta="-1" aria-label="Remove one ${product.name}">−</button><span>${cart[product.id]}</span><button data-change="${product.id}" data-delta="1" aria-label="Add one ${product.name}">+</button></div></div><strong>₹${product.price * cart[product.id]}</strong></div>`).join('') : '<p class="cart-empty">Your bag is waiting for a little goodness.</p>';
  try { localStorage.setItem('yaakai-cart', JSON.stringify(cart)); } catch { /* The bag still works for this visit. */ }
}

function setDrawer(open) {
  drawer.classList.toggle('open', open);
  drawer.setAttribute('aria-hidden', String(!open));
  overlay.hidden = !open;
  document.body.classList.toggle('drawer-open', open);
  if (open) document.querySelector('.close-cart').focus();
  else document.querySelector('.bag-button').focus();
}

document.querySelector('.filters').addEventListener('click', event => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  category = button.dataset.category;
  document.querySelectorAll('.filter').forEach(filter => filter.classList.toggle('active', filter === button));
  renderProducts();
});
search.addEventListener('input', renderProducts);
document.querySelector('.search-toggle').addEventListener('click', () => { document.querySelector('#shop').scrollIntoView(); search.focus(); });
grid.addEventListener('click', event => {
  const button = event.target.closest('[data-add]');
  if (!button) return;
  cart[button.dataset.add] = (cart[button.dataset.add] || 0) + 1;
  renderCart();
  setDrawer(true);
});
document.querySelector('.cart-items').addEventListener('click', event => {
  const button = event.target.closest('[data-change]');
  if (!button) return;
  const id = button.dataset.change;
  cart[id] = Math.max(0, (cart[id] || 0) + Number(button.dataset.delta));
  renderCart();
});
document.querySelector('.bag-button').addEventListener('click', () => setDrawer(true));
document.querySelector('.close-cart').addEventListener('click', () => setDrawer(false));
overlay.addEventListener('click', () => setDrawer(false));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && drawer.classList.contains('open')) setDrawer(false); });
renderProducts();
renderCart();