// Update this page (the content is just a fallback if you fail to update the page)
import { Navigate } from 'react-router-dom';

const Index = () => {
  // Redireciona para o dashboard ao invés de mostrar página placeholder
  return <Navigate to="/login" replace />;
};

export default Index;
