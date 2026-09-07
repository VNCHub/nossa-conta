import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Erro } from '../components/ui';

type Modo = 'entrar' | 'criar';

export default function Login() {
  const { entrar, cadastrar } = useAuth();
  const [modo, setModo] = useState<Modo>('entrar');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [novaFam, setNovaFam] = useState('');

  const trocarModo = (m: Modo) => {
    setModo(m);
    setErro('');
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');

    if (modo === 'criar') {
      if (!nome.trim() || !email.trim() || senha.length < 6) {
        return setErro('Preencha nome, e-mail e uma senha de 6 caracteres ou mais.');
      }
      if (!codigo.trim() && !novaFam.trim()) {
        return setErro('Crie uma família ou entre com um código de convite.');
      }
    }

    setEnviando(true);
    try {
      if (modo === 'entrar') {
        await entrar(email, senha);
      } else {
        await cadastrar({
          nome,
          email,
          senha,
          codigoConvite: codigo.trim() || undefined,
          nomeFamilia: codigo.trim() ? undefined : novaFam.trim(),
        });
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="gf login">
      <div className="loginbox">
        <h1 style={{ marginBottom: 6 }}>Grana a Dois</h1>
        <p className="sub" style={{ marginBottom: 24 }}>
          Cada um lança o que gastou. No fim do mês, o app diz quem paga quanto pra quem.
        </p>

        <form className="card" onSubmit={enviar}>
          <div className="pillbar" style={{ marginBottom: 18 }}>
            <button type="button" className={modo === 'entrar' ? 'on' : ''} onClick={() => trocarModo('entrar')}>
              Entrar
            </button>
            <button type="button" className={modo === 'criar' ? 'on' : ''} onClick={() => trocarModo('criar')}>
              Criar conta
            </button>
          </div>

          <div className="stack">
            {modo === 'criar' && (
              <div>
                <label className="f" htmlFor="nome">Nome</label>
                <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
              </div>
            )}

            <div>
              <label className="f" htmlFor="email">E-mail</label>
              <input
                id="email" type="email" value={email} autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="f" htmlFor="senha">Senha</label>
              <input
                id="senha" type="password" value={senha}
                autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>

            {modo === 'criar' && (
              <div className="grid2" style={{ gap: 12 }}>
                <div>
                  <label className="f" htmlFor="codigo">Código de convite</label>
                  <input
                    id="codigo" placeholder="VILA-7K2M" value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="f" htmlFor="fam">ou crie uma família</label>
                  <input
                    id="fam" placeholder="Nome da família" value={novaFam}
                    disabled={!!codigo.trim()}
                    onChange={(e) => setNovaFam(e.target.value)}
                  />
                </div>
              </div>
            )}

            <button className="btn" type="submit" disabled={enviando}>
              {enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
            </button>
            <Erro>{erro}</Erro>
          </div>
        </form>
      </div>
    </div>
  );
}
