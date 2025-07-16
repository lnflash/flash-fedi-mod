# Flash Fedi Mod

A modern, responsive web application that brings the Flash mobile app experience to the web, specifically designed for Fedimint eCash payments with Lightning Network integration.

## 🚀 Features

- **Flash Design System**: Authentic look and feel matching the Flash mobile app
- **Fedimint Integration**: Native support for Fedimint eCash payments
- **Lightning Network**: Full Lightning address and invoice support
- **WebLN Integration**: Seamless browser wallet integration
- **Responsive Design**: Optimized for mobile and desktop
- **Real-time Balance**: Live balance updates and transaction history
- **QR Code Generation**: Easy invoice sharing with QR codes

## 🎨 Design

This app replicates the exact design system from the Flash mobile app:

- **Colors**: Primary green (#007856), proper grey scale, and semantic colors
- **Typography**: Sora font family with proper sizing hierarchy
- **Components**: Card-based layout with rounded corners and subtle shadows
- **Interactions**: Smooth transitions and hover effects
- **Layout**: Mobile-first responsive design

## 🛠️ Technology Stack

- **React 18**: Modern React with hooks
- **TailwindCSS 3**: Utility-first CSS framework
- **Fedi UI Library**: Official Fedimint UI components
- **WebLN**: Lightning Network browser integration
- **Fedimint**: eCash and Lightning payment processing

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd flash-fedi
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🔧 Configuration

### WebLN Setup

The app requires WebLN to be enabled in your browser. Install a WebLN-compatible wallet extension:

- **Alby**: [https://getalby.com](https://getalby.com)
- **Zap**: [https://zap.jackmallers.com](https://zap.jackmallers.com)
- **Phoenix**: [https://phoenix.acinq.co](https://phoenix.acinq.co)

### Fedimint Federation

Connect to a Fedimint federation by configuring your WebLN provider with the appropriate federation endpoints.

## 🎯 Usage

### Sending Payments

1. Navigate to the "Send" tab
2. Enter the recipient's Lightning address or Fedimint username
3. Specify the amount in satoshis
4. Add an optional memo
5. Click "Send Payment"

### Receiving Payments

1. Navigate to the "Receive" tab
2. Enter the amount you want to receive
3. Add an optional memo
4. Generate an invoice
5. Share the QR code or invoice with the sender

### Transaction History

View all your recent transactions in the "History" tab, including:
- Payment direction (send/receive)
- Amount and currency
- Recipient/sender information
- Timestamp and status
- Memo notes

## 🎨 Customization

### Colors

The app uses Flash's exact color palette defined in `tailwind.config.js`:

```javascript
colors: {
  primary: '#007856',
  grey: {
    0: '#3A3C51',
    1: '#61637A',
    // ... more colors
  }
}
```

### Typography

Uses the Sora font family with proper sizing:

```css
.flash-text-h1 { /* 24px, semibold */ }
.flash-text-h2 { /* 20px, semibold */ }
.flash-text-p1 { /* 18px, regular */ }
.flash-text-p2 { /* 16px, regular */ }
```

### Components

Custom Flash-style components are available:

```css
.flash-card { /* Card with proper styling */ }
.flash-button { /* Primary button */ }
.flash-button-secondary { /* Secondary button */ }
```

## 🔒 Security

- **Client-side**: All sensitive operations happen in the browser
- **WebLN**: Secure Lightning Network integration
- **Fedimint**: Privacy-preserving eCash transactions
- **No server storage**: No personal data stored on servers

## 📱 Mobile Optimization

The app is fully responsive and optimized for mobile devices:

- Touch-friendly interface
- Proper viewport scaling
- Mobile-optimized button sizes
- Responsive typography

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Static Hosting

The app can be deployed to any static hosting service:

- **Vercel**: `vercel --prod`
- **Netlify**: `netlify deploy --prod`
- **GitHub Pages**: Configure in repository settings

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Flash Team**: For the original mobile app design and inspiration
- **Fedimint Community**: For the eCash technology
- **Lightning Network**: For the payment infrastructure
- **WebLN**: For browser Lightning integration

## 📞 Support

For support and questions:

- **Issues**: Create an issue on GitHub
- **Discussions**: Use GitHub Discussions
- **Documentation**: Check the Fedimint docs

---

**Flash Fedi Mod** - Bringing the Flash experience to the web with Fedimint eCash! ⚡
