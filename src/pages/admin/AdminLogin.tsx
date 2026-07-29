import { useState, useEffect } from 'react';
import { Lock, ChevronLeft, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { navigate } from '../../App';

export function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('admin_auth') === 'true') {
      navigate('/admin/dashboard');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data } = await supabase.from('settings').select('value').eq('key', 'admin_password').single();
    const adminPassword = data?.value || 'admin123';

    if (password === adminPassword) {
      sessionStorage.setItem('admin_auth', 'true');
      navigate('/admin/dashboard');
    } else {
      setError('Senha incorreta');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-primary-900 flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors mb-8">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="bg-white rounded-2xl p-8 shadow-xl animate-scale-in">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Área Administrativa</h1>
            <p className="text-sm text-gray-500 mt-1">Digite a senha para acessar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label-field">Senha</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  className="input-field pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-error-500 mt-2 animate-fade-in">{error}</p>}
            </div>
            <button type="submit" disabled={loading || !password} className="btn-primary w-full">
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">Senha padrão: admin123</p>
        </div>
      </div>
    </div>
  );
}
