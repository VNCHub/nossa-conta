import { useState, type FormEvent } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Erro } from '../components/ui';

/**
 * Estado possível para uma conta que ficou sem família (o criador saiu, por
 * exemplo). Sem isso, o app cairia em 403 em todas as telas.
 */
export default function SemFamilia() {
  const { usuario, recarregarUsuario, sair } = useAuth();
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      if (codigo.trim()) await api.post('/familias/entrar', { codigo: codigo.trim() });
      else if (nome.trim()) await api.post('/familias', { nome: nome.trim() });
      else return setErro('Informe um código de convite ou o nome da nova família.');
      await recarregarUsuario();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="gf login">
      <div className="loginbox">
        <h1 style={{ marginBottom: 6 }}>Olá, {usuario?.nome}</h1>
        <p className="sub" style={{ marginBottom: 24 }}>
          Você ainda não faz parte de uma família. Entre em uma ou crie a sua.
        </p>
        <form className="card stack" onSubmit={enviar}>
          <div>
            <label className="f" htmlFor="cod">Código de convite</label>
            <input id="cod" placeholder="VILA-7K2M" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </div>
          <div>
            <label className="f" htmlFor="nova">ou crie uma família</label>
            <input
              id="nova" placeholder="Nome da família" value={nome}
              disabled={!!codigo.trim()} onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <button className="btn" type="submit" disabled={enviando}>
            {enviando ? 'Aguarde…' : 'Continuar'}
          </button>
          <Erro>{erro}</Erro>
          <button type="button" className="btn ghost sm" onClick={() => void sair()}>
            Sair da conta
          </button>
        </form>
      </div>
    </div>
  );
}
