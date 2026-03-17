export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Shop</h3>
            <p className="text-gray-400">
              Your one-stop shop for all your needs.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="/products" className="hover:text-white">
                  Products
                </a>
              </li>
              <li>
                <a href="/cart" className="hover:text-white">
                  Cart
                </a>
              </li>
              <li>
                <a href="/orders" className="hover:text-white">
                  Orders
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <p className="text-gray-400">support@shop.com</p>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
          &copy; {new Date().getFullYear()} Shop. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
