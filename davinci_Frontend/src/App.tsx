import { InvoiceViewer } from './components/invoice/InvoiceViewer';
import { ConsolidatedInvoiceViewer } from './components/invoice/ConsolidatedInvoiceViewer';
import { Home } from './components/Home';

function App() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);

  if (path === '/consolidated-invoice') {
    return <ConsolidatedInvoiceViewer />;
  }

  // Show InvoiceViewer for explicit route OR legacy root route with ID
  if (path === '/invoice' || (path === '/' && params.has('id'))) {
    return <InvoiceViewer />;
  }

  return <Home />;
}

export default App;
