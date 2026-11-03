import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import Clientes from '@/components/Clientes';
import NovoContrato from '@/components/NovoContrato';
import type { Page } from '@/components/Layout';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [preselectedClientId, setPreselectedClientId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const removeBadge = () => {
      document.querySelectorAll('[data-bolt-badge], .bolt-badge, a[href*="bolt.new"]').forEach((element) => element.remove());
    };

    removeBadge();
    const interval = setInterval(removeBadge, 500);
    return () => clearInterval(interval);
  }, []);

  function handleNavigate(page: Page) {
    if (page !== 'novo-contrato') {
      setPreselectedClientId(undefined);
    }
    setCurrentPage(page);
  }

  function handleNewContractForClient(clienteId: string) {
    setPreselectedClientId(clienteId);
    setCurrentPage('novo-contrato');
  }

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigate}>
      {currentPage === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
      {currentPage === 'clientes' && (
        <Clientes onNavigate={handleNavigate} onNewContractForClient={handleNewContractForClient} />
      )}
      {currentPage === 'novo-contrato' && (
        <NovoContrato preselectedClientId={preselectedClientId} onNavigate={handleNavigate} />
      )}
    </Layout>
  );
}

export default App;
