import { useEffect, useState } from 'react'

const UNIDADES_INTEIRAS = [
  'comprimidos',
  'cápsulas',
  'gotas',
  'doses',
  'frascos',
]

function dataHoje() {
  const d = new Date()

  return `${d.getFullYear()}-${String(
    d.getMonth() + 1
  ).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

function formatarData(data) {
  if (!data) return ''

  const partes = String(data).split('-')

  if (partes.length !== 3) return data

  const [ano, mes, dia] = partes

  return `${dia}/${mes}/${ano}`
}

function adicionarMeses(data, meses) {
  if (!data) return ''

  const partes = String(data).split('-')

  if (partes.length !== 3) return ''

  const ano = Number(partes[0])
  const mes = Number(partes[1])
  const dia = Number(partes[2])

  const novaData = new Date(
    ano,
    mes - 1 + meses,
    dia
  )

  return `${novaData.getFullYear()}-${String(
    novaData.getMonth() + 1
  ).padStart(2, '0')}-${String(
    novaData.getDate()
  ).padStart(2, '0')}`
}

function calcularValidadeReceita(tipo, dataReceita) {
  if (!dataReceita) return ''

  if (tipo === 'posto') {
    return adicionarMeses(dataReceita, 6)
  }

  return adicionarMeses(dataReceita, 1)
}

function calcularProximaRetirada(
  dataReceita,
  retiradas = []
) {
  if (!dataReceita) return ''

  if (!retiradas || retiradas.length === 0) {
    return dataReceita
  }

  const datas = retiradas
    .map(item => item.data)
    .filter(Boolean)
    .sort()

  const ultima = datas[datas.length - 1]

  if (!ultima) return dataReceita

  return adicionarMeses(ultima, 1)
}

function App() {
  const [medicamentos, setMedicamentos] = useState(() => {
    const salvo = localStorage.getItem('medicamentos')

    if (!salvo) return []

    try {
      const dados = JSON.parse(salvo)

      if (!Array.isArray(dados)) {
        return []
      }

      return dados.map(med => ({
        ...med,
        unidade: med.unidade || 'comprimidos',
        quantidadePorTomada:
          Number(med.quantidadePorTomada) || 1,
        tomadas: med.tomadas || {},
        esquecimentos: med.esquecimentos || {},
        receita: med.receita || null,
      }))
    } catch {
      return []
    }
  })

  const [historico, setHistorico] = useState(() => {
    const salvo = localStorage.getItem('historico')

    if (!salvo) return []

    try {
      const dados = JSON.parse(salvo)

      if (!Array.isArray(dados)) {
        return []
      }

      return dados
    } catch {
      return []
    }
  })

  const [nome, setNome] = useState('')
  const [dose, setDose] = useState('')
  const [unidade, setUnidade] =
    useState('comprimidos')
  const [estoque, setEstoque] = useState('')
  const [quantidadePorTomada, setQuantidadePorTomada] =
    useState('1')
  const [intervalo, setIntervalo] =
    useState('12')
  const [primeiroHorario, setPrimeiroHorario] =
    useState('08:00')

  const [tipoReceita, setTipoReceita] =
    useState('nenhuma')
  const [dataReceita, setDataReceita] =
    useState('')
  const [dataPrimeiraRetirada, setDataPrimeiraRetirada] =
    useState('')

  useEffect(() => {
    localStorage.setItem(
      'medicamentos',
      JSON.stringify(medicamentos)
    )
  }, [medicamentos])

  useEffect(() => {
    localStorage.setItem(
      'historico',
      JSON.stringify(historico)
    )
  }, [historico])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(erro => {
        console.error(
          'Erro ao registrar Service Worker:',
          erro
        )
      })
  }, [])

  useEffect(() => {
    const verificarHorarios = async () => {
      if (!('serviceWorker' in navigator)) return

      if (
        !('Notification' in window) ||
        Notification.permission !== 'granted'
      ) {
        return
      }

      try {
        const registro =
          await navigator.serviceWorker.ready

        const agora = new Date()

        const horaAtual =
          String(agora.getHours()).padStart(2, '0') +
          ':' +
          String(agora.getMinutes()).padStart(2, '0')

        const hoje = dataHoje()

        medicamentos.forEach(med => {
          const horarios = gerarHorarios(
            med.primeiroHorario || '08:00',
            med.intervalo || 12
          )

          if (!horarios.includes(horaAtual)) {
            return
          }

          const chave =
            `notificacao-${hoje}-${med.id}-${horaAtual}`

          if (localStorage.getItem(chave)) {
            return
          }

          registro.showNotification(
            '💊 Hora do remédio!',
            {
              body:
                `Está na hora de tomar: ${med.nome}` +
                (med.dose
                  ? ` — ${med.dose}`
                  : ''),
              tag:
                `remedio-${med.id}-${horaAtual}`,
            }
          )

          localStorage.setItem(
            chave,
            'enviada'
          )
        })
      } catch (erro) {
        console.error(
          'Erro ao verificar notificações:',
          erro
        )
      }
    }

    verificarHorarios()

    const intervaloNotificacao =
      setInterval(
        verificarHorarios,
        30000
      )

    return () =>
      clearInterval(
        intervaloNotificacao
      )
  }, [medicamentos])

  function nomeUnidade(
    unidadeAtual,
    quantidade
  ) {
    if (unidadeAtual === 'comprimidos') {
      return quantidade === 1
        ? 'comprimido'
        : 'comprimidos'
    }

    if (unidadeAtual === 'cápsulas') {
      return quantidade === 1
        ? 'cápsula'
        : 'cápsulas'
    }

    if (unidadeAtual === 'gotas') {
      return quantidade === 1
        ? 'gota'
        : 'gotas'
    }

    if (unidadeAtual === 'mL') {
      return 'mL'
    }

    if (unidadeAtual === 'doses') {
      return quantidade === 1
        ? 'dose'
        : 'doses'
    }

    if (unidadeAtual === 'frascos') {
      return quantidade === 1
        ? 'frasco'
        : 'frascos'
    }

    return unidadeAtual
  }

  function gerarHorarios(
    horarioInicial,
    intervaloHoras
  ) {
    const horarios = []

    const partes = String(
      horarioInicial || '08:00'
    ).split(':')

    let minutos =
      Number(partes[0]) * 60 +
      Number(partes[1])

    const intervaloMinutos =
      Number(intervaloHoras) * 60

    if (
      !Number.isFinite(minutos) ||
      !Number.isFinite(intervaloMinutos) ||
      intervaloMinutos <= 0
    ) {
      return []
    }

    let total = 0

    while (total < 24 * 60) {
      const hora =
        Math.floor(
          (minutos % 1440) / 60
        )

      const minuto =
        minutos % 60

      horarios.push(
        `${String(hora).padStart(
          2,
          '0'
        )}:${String(minuto).padStart(
          2,
          '0'
        )}`
      )

      minutos += intervaloMinutos
      total += intervaloMinutos

      if (minutos >= 1440) {
        minutos -= 1440
      }

      if (horarios.length > 24) {
        break
      }
    }

    return horarios
  }

  function adicionarMedicamento(e) {
    if (e) {
      e.preventDefault()
    }

    if (!nome.trim()) {
      alert('Digite o nome do medicamento.')
      return
    }

    const estoqueNumero =
      Number(estoque)

    const quantidadeNumero =
      Number(quantidadePorTomada)

    if (
      !Number.isFinite(estoqueNumero) ||
      estoqueNumero < 0
    ) {
      alert('Informe um estoque válido.')
      return
    }

    if (
      !Number.isFinite(quantidadeNumero) ||
      quantidadeNumero <= 0
    ) {
      alert(
        'Informe uma quantidade válida por tomada.'
      )
      return
    }

    const receita =
      tipoReceita !== 'nenhuma'
        ? {
            tipo: tipoReceita,
            data: dataReceita,
            validade:
              calcularValidadeReceita(
                tipoReceita,
                dataReceita
              ),
            primeiraRetirada:
              tipoReceita === 'posto'
                ? dataPrimeiraRetirada
                : '',
            retiradas:
              tipoReceita === 'posto' &&
              dataPrimeiraRetirada
                ? [
                    {
                      data:
                        dataPrimeiraRetirada,
                    },
                  ]
                : [],
            proximaRetirada:
              tipoReceita === 'posto' &&
              dataPrimeiraRetirada
                ? adicionarMeses(
                    dataPrimeiraRetirada,
                    1
                  )
                : '',
          }
        : null

    const novoMedicamento = {
      id: Date.now(),
      nome: nome.trim(),
      dose: dose.trim(),
      unidade,

      estoque:
        UNIDADES_INTEIRAS.includes(
          unidade
        )
          ? Math.round(estoqueNumero)
          : estoqueNumero,

      quantidadePorTomada:
        UNIDADES_INTEIRAS.includes(
          unidade
        )
          ? Math.round(
              quantidadeNumero
            )
          : quantidadeNumero,

      intervalo:
        Number(intervalo) || 12,

      primeiroHorario,

      tomadas: {},
      esquecimentos: {},

      receita,
    }

    setMedicamentos(lista => [
      ...lista,
      novoMedicamento,
    ])

    setNome('')
    setDose('')
    setUnidade('comprimidos')
    setEstoque('')
    setQuantidadePorTomada('1')
    setIntervalo('12')
    setPrimeiroHorario('08:00')
    setTipoReceita('nenhuma')
    setDataReceita('')
    setDataPrimeiraRetirada('')
  }

  function tomarMedicamento(
    medicamentoId,
    horario
  ) {
    const hoje = dataHoje()

    setMedicamentos(lista =>
      lista.map(med => {
        if (med.id !== medicamentoId) {
          return med
        }

        const chave =
          `${hoje}_${horario}`

        if (med.tomadas?.[chave]) {
          return med
        }

        if (med.esquecimentos?.[chave]) {
          return med
        }

        let quantidade =
          Number(
            med.quantidadePorTomada
          ) || 1

        if (
          UNIDADES_INTEIRAS.includes(
            med.unidade
          )
        ) {
          quantidade =
            Math.round(quantidade)
        }

        const estoqueAtual =
          Number(
            med.estoque || 0
          )

        if (
          estoqueAtual <
          quantidade
        ) {
          alert(
            `⚠️ Não há ${nomeUnidade(
              med.unidade,
              quantidade
            )} suficientes no estoque.`
          )

          return med
        }

        const novoEstoque =
          estoqueAtual -
          quantidade

        const novasTomadas = {
          ...(med.tomadas || {}),
          [chave]: true,
        }

        const novoHistorico = {
          id:
            Date.now(),
          medicamentoId:
            med.id,
          nome:
            med.nome,
          dose:
            med.dose,
          horario,
          data:
            hoje,
          quantidade,
          unidade:
            med.unidade,
          tipo:
            'tomado',
        }

        setHistorico(h => {
          const jaExiste =
            h.some(
              item =>
                item.medicamentoId ===
                  med.id &&
                item.data ===
                  hoje &&
                item.horario ===
                  horario
            )

          if (jaExiste) {
            return h
          }

          return [
            novoHistorico,
            ...h,
          ]
        })

        return {
          ...med,
          estoque:
            novoEstoque,
          tomadas:
            novasTomadas,
        }
      })
    )
  }

  function esquecerMedicamento(
    medicamentoId,
    horario
  ) {
    const hoje = dataHoje()

    setMedicamentos(lista =>
      lista.map(med => {
        if (med.id !== medicamentoId) {
          return med
        }

        const chave =
          `${hoje}_${horario}`

        if (med.tomadas?.[chave]) {
          return med
        }

        if (med.esquecimentos?.[chave]) {
          return med
        }

        const novosEsquecimentos = {
          ...(med.esquecimentos || {}),
          [chave]: true,
        }

        const quantidade =
          Number(
            med.quantidadePorTomada
          ) || 1

        const novoHistorico = {
          id:
            Date.now(),
          medicamentoId:
            med.id,
          nome:
            med.nome,
          dose:
            med.dose,
          horario,
          data:
            hoje,
          quantidade,
          unidade:
            med.unidade,
          tipo:
            'esquecido',
        }

        setHistorico(h => {
          const jaExiste =
            h.some(
              item =>
                item.medicamentoId ===
                  med.id &&
                item.data ===
                  hoje &&
                item.horario ===
                  horario
            )

          if (jaExiste) {
            return h
          }

          return [
            novoHistorico,
            ...h,
          ]
        })

        return {
          ...med,
          esquecimentos:
            novosEsquecimentos,
        }
      })
    )
  }

  function excluirMedicamento(id) {
    if (
      !confirm(
        'Deseja excluir este medicamento?'
      )
    ) {
      return
    }

    setMedicamentos(lista =>
      lista.filter(
        med => med.id !== id
      )
    )
  }

  function limparHistorico() {
    if (
      !confirm(
        'Deseja limpar todo o histórico?'
      )
    ) {
      return
    }

    setHistorico([])
  }

  function registrarRetirada(id) {
    const hoje = dataHoje()

    setMedicamentos(lista =>
      lista.map(med => {
        if (med.id !== id) {
          return med
        }

        if (
          !med.receita ||
          med.receita.tipo !== 'posto'
        ) {
          return med
        }

        const proximaRetirada =
          med.receita
            .proximaRetirada

        if (
          proximaRetirada &&
          hoje < proximaRetirada
        ) {
          alert(
            `A próxima retirada está prevista para ${formatarData(
              proximaRetirada
            )}.`
          )

          return med
        }

        const retiradas =
          med.receita.retiradas || []

        const jaRegistrouHoje =
          retiradas.some(
            item =>
              item.data === hoje
          )

        if (jaRegistrouHoje) {
          alert(
            'A retirada de hoje já foi registrada.'
          )

          return med
        }

        const novasRetiradas = [
          ...retiradas,
          {
            data: hoje,
          },
        ]

        return {
          ...med,
          receita: {
            ...med.receita,
            retiradas:
              novasRetiradas,
            proximaRetirada:
              calcularProximaRetirada(
                med.receita.data,
                novasRetiradas
              ),
          },
        }
      })
    )
  }

  function editarMedicamento(med) {
    setNome(med.nome || '')
    setDose(med.dose || '')
    setUnidade(
      med.unidade ||
        'comprimidos'
    )
    setEstoque(
      String(
        med.estoque ?? ''
      )
    )
    setQuantidadePorTomada(
      String(
        med.quantidadePorTomada ??
          1
      )
    )
    setIntervalo(
      String(
        med.intervalo ?? 12
      )
    )
    setPrimeiroHorario(
      med.primeiroHorario ||
        '08:00'
    )

    if (med.receita) {
      setTipoReceita(
        med.receita.tipo ||
          'nenhuma'
      )
      setDataReceita(
        med.receita.data ||
          ''
      )
      setDataPrimeiraRetirada(
        med.receita
          .primeiraRetirada ||
          ''
      )
    } else {
      setTipoReceita(
        'nenhuma'
      )
      setDataReceita('')
      setDataPrimeiraRetirada('')
    }

    setMedicamentos(lista =>
      lista.filter(
        item =>
          item.id !== med.id
      )
    )

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function statusEstoque(med) {
    const quantidade =
      Number(
        med.estoque || 0
      )

    if (quantidade <= 0) {
      return {
        texto:
          'Estoque zerado',
        classe:
          'estoque-zerado',
      }
    }

    if (quantidade <= 10) {
      return {
        texto:
          'Estoque baixo',
        classe:
          'estoque-baixo',
      }
    }

    return {
      texto:
        'Estoque normal',
      classe:
        'estoque-normal',
    }
  }

  function contarEsquecimentos(
    medicamentoId
  ) {
    return historico.filter(
      item =>
        item.medicamentoId ===
          medicamentoId &&
        item.tipo ===
          'esquecido'
    ).length
  }

  const esquecimentos =
    historico.filter(
      item =>
        item.tipo ===
        'esquecido'
    )

  const totalEsquecimentos =
    esquecimentos.length

  const tomadas =
    historico.filter(
      item => item.tipo === 'tomado'
    )

  const totalTomadas =
    tomadas.length

  const totalDosesRegistradas =
    totalTomadas +
    totalEsquecimentos

  const taxaEsquecimento =
    totalDosesRegistradas > 0
      ? Math.round(
          (totalEsquecimentos /
            totalDosesRegistradas) *
            100
        )
      : 0

  const contagemPorMedicamento =
    esquecimentos.reduce(
      (acc, item) => {
        const chave =
          item.medicamentoId ??
          item.nome ??
          'Desconhecido'

        if (!acc[chave]) {
          acc[chave] = {
            nome:
              item.nome ||
              'Medicamento',
            quantidade: 0,
          }
        }

        acc[chave].quantidade += 1

        return acc
      },
      {}
    )

  const medicamentoMaisEsquecido =
    Object.values(
      contagemPorMedicamento
    ).sort(
      (a, b) =>
        b.quantidade -
        a.quantidade
    )[0] || null

  const contagemPorHorario =
    esquecimentos.reduce(
      (acc, item) => {
        const horario =
          item.horario ||
          'Sem horário'

        acc[horario] =
          (acc[horario] || 0) +
          1

        return acc
      },
      {}
    )

  const horarioMaisEsquecido =
    Object.entries(
      contagemPorHorario
    ).sort(
      (a, b) =>
        b[1] - a[1]
    )[0] || null

  return (
    <div
      style={{
        maxWidth:
          '900px',
        margin:
          '0 auto',
        padding:
          '20px',
        fontFamily:
          'Arial, sans-serif',
        background:
          '#f5f7fb',
        minHeight:
          '100vh',
      }}
    >
      <h1
        style={{
          textAlign:
            'center',
          fontSize:
            '30px',
          fontWeight:
            '700',
          marginBottom:
            '8px',
        }}
      >
        💊 Controle de Remédios
      </h1>

      <p
        style={{
          textAlign:
            'center',
          fontSize:
            '20px',
          fontWeight:
            '500',
          marginBottom:
            '25px',
          lineHeight:
            '1.4',
        }}
      >
        Organize seus medicamentos
        <br />
        e horários.
      </p>

      <div
        style={{
          background:
            'white',
          padding:
            '20px',
          borderRadius:
            '15px',
          marginBottom:
            '25px',
        }}
      >
        <h2
          style={{
            fontSize:
              '26px',
            marginTop:
              '0',
          }}
        >
          Adicionar medicamento
        </h2>

        <form
          onSubmit={
            adicionarMedicamento
          }
        >
          <input
            value={nome}
            onChange={e =>
              setNome(
                e.target.value
              )
            }
            placeholder="Nome do medicamento"
            style={
              estiloInput
            }
          />

          <input
            value={dose}
            onChange={e =>
              setDose(
                e.target.value
              )
            }
            placeholder="Dose (ex.: 50 mg)"
            style={
              estiloInput
            }
          />

          <label
            style={
              estiloLabel
            }
          >
            Tipo de estoque
          </label>

          <select
            value={unidade}
            onChange={e => {
              const novaUnidade =
                e.target.value

              setUnidade(
                novaUnidade
              )

              if (
                UNIDADES_INTEIRAS.includes(
                  novaUnidade
                )
              ) {
                setQuantidadePorTomada(
                  String(
                    Math.max(
                      1,
                      Math.round(
                        Number(
                          quantidadePorTomada
                        ) || 1
                      )
                    )
                  )
                )
              }
            }}
            style={
              estiloInput
            }
          >
            <option value="comprimidos">
              💊 Comprimidos
            </option>

            <option value="cápsulas">
              💊 Cápsulas
            </option>

            <option value="gotas">
              💧 Gotas
            </option>

            <option value="mL">
              🧴 mL
            </option>

            <option value="doses">
              🥄 Doses
            </option>

            <option value="frascos">
              🧴 Frascos
            </option>
          </select>

          <input
            type="number"
            min="0"
            step={
              unidade === 'mL'
                ? '0.01'
                : '1'
            }
            value={estoque}
            onChange={e =>
              setEstoque(
                e.target.value
              )
            }
            placeholder={`Quantidade em estoque (${nomeUnidade(
              unidade,
              2
            )})`}
            style={
              estiloInput
            }
          />

          <input
            type="number"
            min="1"
            step={
              unidade === 'mL'
                ? '0.01'
                : '1'
            }
            value={
              quantidadePorTomada
            }
            onChange={e => {
              let valor =
                e.target.value

              if (
                UNIDADES_INTEIRAS.includes(
                  unidade
                ) &&
                valor !== ''
              ) {
                valor =
                  String(
                    Math.round(
                      Number(
                        valor
                      )
                    )
                  )
              }

              setQuantidadePorTomada(
                valor
              )
            }}
            placeholder={`Quantidade por tomada (${nomeUnidade(
              unidade,
              2
            )})`}
            style={
              estiloInput
            }
          />

          <label
            style={
              estiloLabel
            }
          >
            Intervalo entre as tomadas
          </label>

          <select
            value={intervalo}
            onChange={e =>
              setIntervalo(
                e.target.value
              )
            }
            style={
              estiloInput
            }
          >
            <option value="4">
              A cada 4 horas
            </option>

            <option value="6">
              A cada 6 horas
            </option>

            <option value="8">
              A cada 8 horas
            </option>

            <option value="12">
              A cada 12 horas
            </option>

            <option value="24">
              1 vez ao dia
            </option>
          </select>

          <label
            style={
              estiloLabel
            }
          >
            Primeiro horário
          </label>

          <input
            type="time"
            value={
              primeiroHorario
            }
            onChange={e =>
              setPrimeiroHorario(
                e.target.value
              )
            }
            style={
              estiloInput
            }
          />

          <label
            style={
              estiloLabel
            }
          >
            Receita
          </label>

          <select
            value={
              tipoReceita
            }
            onChange={e =>
              setTipoReceita(
                e.target.value
              )
            }
            style={
              estiloInput
            }
          >
            <option value="nenhuma">
              Sem receita
            </option>

            <option value="comum">
              📄 Receita comum
            </option>

            <option value="posto">
              🏥 Receita do Posto de Saúde
            </option>
          </select>

          {tipoReceita !==
            'nenhuma' && (
            <>
              <label
                style={
                  estiloLabel
                }
              >
                📄 Data da receita
              </label>

              <input
                type="date"
                value={
                  dataReceita
                }
                onChange={e =>
                  setDataReceita(
                    e.target.value
                  )
                }
                style={
                  estiloInput
                }
              />

              {tipoReceita ===
                'posto' && (
                <>
                  <label
                    style={
                      estiloLabel
                    }
                  >
                    🏥 Data da primeira retirada
                  </label>

                  <input
                    type="date"
                    value={
                      dataPrimeiraRetirada
                    }
                    onChange={e =>
                      setDataPrimeiraRetirada(
                        e.target.value
                      )
                    }
                    style={
                      estiloInput
                    }
                  />
                </>
              )}

              {dataReceita && (
                <div
                  style={{
                    background:
                      '#e8f5e9',
                    padding:
                      '15px',
                    borderRadius:
                      '10px',
                    marginBottom:
                      '15px',
                    fontSize:
                      '18px',
                    lineHeight:
                      '1.6',
                  }}
                >
                  <strong>
                    📅 Data da receita:{' '}
                    {formatarData(
                      dataReceita
                    )}
                  </strong>

                  <br />

                  <strong>
                    ⏳ Válida até:{' '}
                    {formatarData(
                      calcularValidadeReceita(
                        tipoReceita,
                        dataReceita
                      )
                    )}
                  </strong>

                  {tipoReceita ===
                    'posto' &&
                    dataPrimeiraRetirada && (
                    <>
                      <br />

                      <strong>
                        🏥 Primeira retirada:{' '}
                        {formatarData(
                          dataPrimeiraRetirada
                        )}
                      </strong>

                      <br />

                      <strong>
                        📅 Próxima retirada:{' '}
                        {formatarData(
                          adicionarMeses(
                            dataPrimeiraRetirada,
                            1
                          )
                        )}
                      </strong>

                      <br />

                      <small
                        style={{
                          fontSize:
                            '16px',
                        }}
                      >
                        A próxima retirada será calculada
                        1 mês após a retirada realizada.
                      </small>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            style={
              estiloBotao
            }
          >
            + medicamento
          </button>
        </form>
      </div>

      <h2
        style={{
          fontSize:
            '28px',
        }}
      >
        Meus medicamentos
      </h2>

      {medicamentos.length ===
        0 && (
        <p
          style={{
            fontSize:
              '18px',
          }}
        >
          Nenhum medicamento cadastrado.
        </p>
      )}

      {medicamentos.map(
        med => {
          const status =
            statusEstoque(
              med
            )

          const horarios =
            gerarHorarios(
              med.primeiroHorario ||
                '08:00',
              med.intervalo ||
                12
            )

          const podeRetirar =
            med.receita?.tipo ===
              'posto' &&
            (
              !med.receita
                .proximaRetirada ||
              dataHoje() >=
                med.receita
                  .proximaRetirada
            )

          const quantidadeEsquecida =
            contarEsquecimentos(
              med.id
            )

          return (
            <div
              key={
                med.id
              }
              style={{
                background:
                  'white',
                border:
                  '1px solid #ccc',
                borderRadius:
                  '15px',
                padding:
                  '18px',
                marginBottom:
                  '20px',
              }}
            >
              <h2
                style={{
                  fontSize:
                    '26px',
                }}
              >
                💊 {med.nome}
              </h2>

              <p
                style={{
                  fontSize:
                    '18px',
                }}
              >
                <strong>
                  Dose:
                </strong>{' '}
                {med.dose}
              </p>

              <p
                style={{
                  fontSize:
                    '18px',
                }}
              >
                📦{' '}
                <strong>
                  Estoque:
                </strong>{' '}
                {med.estoque}{' '}
                {nomeUnidade(
                  med.unidade,
                  med.estoque
                )}
              </p>

              <p
                style={{
                  padding:
                    '12px',
                  borderRadius:
                    '8px',
                  background:
                    status.classe ===
                    'estoque-normal'
                      ? '#dff5e1'
                      : status.classe ===
                        'estoque-baixo'
                      ? '#fff3cd'
                      : '#f8d7da',
                  fontSize:
                    '18px',
                  fontWeight:
                    'bold',
                }}
              >
                {status.texto}
              </p>

              <p
                style={{
                  fontSize:
                    '18px',
                }}
              >
                💊{' '}
                {
                  med.quantidadePorTomada
                }{' '}
                {nomeUnidade(
                  med.unidade,
                  med.quantidadePorTomada
                )}{' '}
                por tomada
              </p>

              <p
                style={{
                  fontSize:
                    '18px',
                }}
              >
                🔄 A cada{' '}
                {med.intervalo}{' '}
                horas
              </p>

              {med.receita && (
                <div
                  style={{
                    background:
                      '#eef7ff',
                    padding:
                      '15px',
                    borderRadius:
                      '10px',
                    marginTop:
                      '15px',
                    fontSize:
                      '18px',
                    lineHeight:
                      '1.5',
                  }}
                >
                  <h3
                    style={{
                      fontSize:
                        '22px',
                    }}
                  >
                    🧾 Receita
                  </h3>

                  <p>
                    <strong>
                      Tipo:
                    </strong>{' '}
                    {med.receita.tipo ===
                    'posto'
                      ? '🏥 Posto de Saúde'
                      : '📄 Receita comum'}
                  </p>

                  <p>
                    📅{' '}
                    <strong>
                      Data da receita:
                    </strong>{' '}
                    {formatarData(
                      med.receita.data
                    )}
                  </p>

                  <p>
                    ⏳{' '}
                    <strong>
                      Válida até:
                    </strong>{' '}
                    {formatarData(
                      med.receita.validade
                    )}
                  </p>

                  {med.receita.tipo ===
                    'posto' && (
                    <>
                      <p>
                        🏥{' '}
                        <strong>
                          Primeira retirada:
                        </strong>{' '}
                        {formatarData(
                          med.receita
                            .primeiraRetirada
                        )}
                      </p>

                      <p>
                        📅{' '}
                        <strong>
                          Última retirada:
                        </strong>{' '}
                        {med.receita
                          .retiradas?.length
                          ? formatarData(
                              med.receita
                                .retiradas[
                                med.receita
                                  .retiradas
                                  .length -
                                  1
                              ].data
                            )
                          : 'nenhuma registrada'}
                      </p>

                      <p>
                        📅{' '}
                        <strong>
                          Próxima retirada:
                        </strong>{' '}
                        {formatarData(
                          med.receita
                            .proximaRetirada
                        )}
                      </p>

                      <button
                        type="button"
                        disabled={
                          !podeRetirar
                        }
                        onClick={() =>
                          registrarRetirada(
                            med.id
                          )
                        }
                        style={{
                          ...estiloBotao,
                          background:
                            podeRetirar
                              ? '#168b3d'
                              : '#999',
                          cursor:
                            podeRetirar
                              ? 'pointer'
                              : 'not-allowed',
                          opacity:
                            podeRetirar
                              ? 1
                              : 0.7,
                        }}
                      >
                        {podeRetirar
                          ? '🏥 Retirei este mês'
                          : `📅 Próxima retirada: ${formatarData(
                              med.receita
                                .proximaRetirada
                            )}`}
                      </button>
                    </>
                  )}
                </div>
              )}

              {quantidadeEsquecida >
                0 && (
                <div
                  style={{
                    marginTop:
                      '15px',
                    padding:
                      '12px',
                    borderRadius:
                      '10px',
                    background:
                      '#fff3cd',
                    fontSize:
                      '18px',
                  }}
                >
                  ⚠️ Este medicamento foi esquecido{' '}
                  <strong>
                    {quantidadeEsquecida}
                  </strong>{' '}
                  {quantidadeEsquecida ===
                  1
                    ? 'vez'
                    : 'vezes'}.
                </div>
              )}

              {horarios.map(
                horario => {
                  const chave =
                    `${dataHoje()}_${horario}`

                  const tomou =
                    med.tomadas?.[
                      chave
                    ]

                  const esqueceu =
                    med.esquecimentos?.[
                      chave
                    ]

                  const finalizado =
                    tomou ||
                    esqueceu

                  return (
                    <div
                      key={
                        horario
                      }
                      style={{
                        marginTop:
                          '12px',
                        padding:
                          '15px',
                        borderRadius:
                          '12px',
                        background:
                          tomou
                            ? '#d9f7df'
                            : esqueceu
                            ? '#fff3cd'
                            : '#eef4ff',
                        textAlign:
                          'center',
                      }}
                    >
                      <h3
                        style={{
                          fontSize:
                            '24px',
                          margin:
                            '5px 0 15px',
                        }}
                      >
                        ⏰{' '}
                        {horario}
                      </h3>

                      {!finalizado && (
                        <div
                          style={{
                            display:
                              'flex',
                            gap:
                              '10px',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              tomarMedicamento(
                                med.id,
                                horario
                              )
                            }
                            style={{
                              flex:
                                1,
                              padding:
                                '14px',
                              border:
                                'none',
                              borderRadius:
                                '10px',
                              background:
                                '#168bd1',
                              color:
                                'white',
                              fontSize:
                                '18px',
                              fontWeight:
                                'bold',
                              cursor:
                                'pointer',
                            }}
                          >
                            💊 Tomei
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              esquecerMedicamento(
                                med.id,
                                horario
                              )
                            }
                            style={{
                              flex:
                                1,
                              padding:
                                '14px',
                              border:
                                'none',
                              borderRadius:
                                '10px',
                              background:
                                '#d98c00',
                              color:
                                'white',
                              fontSize:
                                '18px',
                              fontWeight:
                                'bold',
                              cursor:
                                'pointer',
                            }}
                          >
                            ⚠️ Esqueci
                          </button>
                        </div>
                      )}

                      {tomou && (
                        <p
                          style={{
                            color:
                              '#168238',
                            fontWeight:
                              'bold',
                            fontSize:
                              '18px',
                          }}
                        >
                          ✓ Medicamento tomado hoje
                        </p>
                      )}

                      {esqueceu && (
                        <p
                          style={{
                            color:
                              '#a66a00',
                            fontWeight:
                              'bold',
                            fontSize:
                              '18px',
                          }}
                        >
                          ⚠️ Dose esquecida
                        </p>
                      )}
                    </div>
                  )
                }
              )}

              <div
                style={{
                  display:
                    'flex',
                  gap:
                    '15px',
                  marginTop:
                    '20px',
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    editarMedicamento(
                      med
                    )
                  }
                  style={{
                    ...botaoSecundario,
                    background:
                      '#168bd1',
                    color:
                      'white',
                  }}
                >
                  ✏️ Editar
                </button>

                <button
                  type="button"
                  onClick={() =>
                    excluirMedicamento(
                      med.id
                    )
                  }
                  style={{
                    ...botaoSecundario,
                    background:
                      '#c62828',
                    color:
                      'white',
                  }}
                >
                  🗑️ Excluir
                </button>
              </div>
            </div>
          )
        }
      )}

      <div
        style={{
          marginTop:
            '40px',
          padding:
            '20px',
          background:
            'white',
          borderTop:
            '3px solid #ddd',
          borderRadius:
            '15px',
        }}
      >
        <h2
          style={{
            fontSize:
              '28px',
          }}
        >
          📊 Resumo de acompanhamento
        </h2>

        <div
          style={{
            display:
              'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(180px, 1fr))',
            gap:
              '12px',
            marginTop:
              '15px',
          }}
        >
          <div
            style={{
              background:
                '#e8f5e9',
              padding:
                '15px',
              borderRadius:
                '10px',
              textAlign:
                'center',
            }}
          >
            <div
              style={{
                fontSize:
                  '28px',
                fontWeight:
                  'bold',
                color:
                  '#168238',
              }}
            >
              {totalTomadas}
            </div>
            <div
              style={{
                fontSize:
                  '18px',
              }}
            >
              💊 Doses tomadas
            </div>
          </div>

          <div
            style={{
              background:
                '#fff3cd',
              padding:
                '15px',
              borderRadius:
                '10px',
              textAlign:
                'center',
            }}
          >
            <div
              style={{
                fontSize:
                  '28px',
                fontWeight:
                  'bold',
                color:
                  '#a66a00',
              }}
            >
              {totalEsquecimentos}
            </div>
            <div
              style={{
                fontSize:
                  '18px',
              }}
            >
              ⚠️ Doses esquecidas
            </div>
          </div>

          <div
            style={{
              background:
                '#eef4ff',
              padding:
                '15px',
              borderRadius:
                '10px',
              textAlign:
                'center',
            }}
          >
            <div
              style={{
                fontSize:
                  '28px',
                fontWeight:
                  'bold',
                color:
                  '#168bd1',
              }}
            >
              {totalDosesRegistradas}
            </div>
            <div
              style={{
                fontSize:
                  '18px',
              }}
            >
              📋 Total registrado
            </div>
          </div>

          <div
            style={{
              background:
                '#f5f7fb',
              padding:
                '15px',
              borderRadius:
                '10px',
              textAlign:
                'center',
            }}
          >
            <div
              style={{
                fontSize:
                  '28px',
                fontWeight:
                  'bold',
                color:
                  '#555',
              }}
            >
              {taxaEsquecimento}%
            </div>
            <div
              style={{
                fontSize:
                  '18px',
              }}
            >
              📈 Taxa de esquecimento
            </div>
          </div>
        </div>

        {totalEsquecimentos ===
        0 ? (
          <p
            style={{
              marginTop:
                '18px',
              color:
                '#168238',
              fontWeight:
                'bold',
              fontSize:
                '18px',
            }}
          >
            ✓ Nenhuma dose esquecida registrada.
          </p>
        ) : (
          <>
            <div
              style={{
                background:
                  '#fff3cd',
                padding:
                  '15px',
                borderRadius:
                  '10px',
                marginTop:
                  '15px',
                fontSize:
                  '18px',
              }}
            >
              💊{' '}
              <strong>
                Medicamento mais esquecido:
              </strong>{' '}
              {medicamentoMaisEsquecido
                ? `${medicamentoMaisEsquecido.nome} (${medicamentoMaisEsquecido.quantidade} ${
                    medicamentoMaisEsquecido.quantidade ===
                    1
                      ? 'vez'
                      : 'vezes'
                  })`
                : 'nenhum'}
            </div>

            <div
              style={{
                background:
                  '#eef4ff',
                padding:
                  '15px',
                borderRadius:
                  '10px',
                marginTop:
                  '10px',
                fontSize:
                  '18px',
              }}
            >
              ⏰{' '}
              <strong>
                Horário com mais esquecimentos:
              </strong>{' '}
              {horarioMaisEsquecido
                ? `${horarioMaisEsquecido[0]} (${horarioMaisEsquecido[1]} ${
                    horarioMaisEsquecido[1] ===
                    1
                      ? 'vez'
                      : 'vezes'
                  })`
                : 'nenhum'}
            </div>

            <h3
              style={{
                marginTop:
                  '20px',
                fontSize:
                  '22px',
              }}
            >
              ⚠️ Esquecimentos por medicamento
            </h3>

            {medicamentos.map(
              med => {
                const quantidade =
                  contarEsquecimentos(
                    med.id
                  )

                if (
                  quantidade ===
                  0
                ) {
                  return null
                }

                return (
                  <div
                    key={
                      med.id
                    }
                    style={{
                      background:
                        '#fff3cd',
                      padding:
                        '12px',
                      borderRadius:
                        '10px',
                      marginTop:
                        '10px',
                      fontSize:
                        '18px',
                    }}
                  >
                    💊{' '}
                    <strong>
                      {med.nome}
                    </strong>
                    : {quantidade}{' '}
                    {quantidade ===
                    1
                      ? 'esquecimento'
                      : 'esquecimentos'}
                  </div>
                )
              }
            )}
          </>
        )}
      </div>

      <div
        style={{
          marginTop:
            '40px',
          padding:
            '20px',
          background:
            'white',
          borderTop:
            '3px solid #ddd',
          borderRadius:
            '15px',
        }}
      >
        <h2
          style={{
            fontSize:
              '28px',
          }}
        >
          📜 Histórico
        </h2>

        {historico.length ===
        0 ? (
          <p
            style={{
              color:
                '#777',
              fontSize:
                '18px',
            }}
          >
            Nenhum registro ainda.
          </p>
        ) : (
          historico.map(
            item => (
              <div
                key={
                  item.id
                }
                style={{
                  background:
                    item.tipo ===
                    'esquecido'
                      ? '#fff3cd'
                      : '#f5f7fb',
                  padding:
                    '15px',
                  borderRadius:
                    '12px',
                  marginTop:
                    '10px',
                  fontSize:
                    '18px',
                  lineHeight:
                    '1.5',
                }}
              >
                💊{' '}
                <strong>
                  {item.nome}
                </strong>

                <br />

                {item.dose}

                <br />

                ⏰ Horário marcado:{' '}
                {item.horario}

                <br />

                {item.tipo ===
                'esquecido' ? (
                  <>
                    ⚠️{' '}
                    <strong>
                      Dose esquecida em{' '}
                    </strong>
                    {formatarData(
                      item.data
                    )}
                  </>
                ) : (
                  <>
                    ✓ Tomado em{' '}
                    {formatarData(
                      item.data
                    )}
                  </>
                )}

                <br />

                💊 Quantidade:{' '}
                {item.quantidade}{' '}
                {nomeUnidade(
                  item.unidade ||
                    'comprimidos',
                  item.quantidade
                )}
              </div>
            )
          )
        )}

        {historico.length >
          0 && (
          <button
            type="button"
            onClick={
              limparHistorico
            }
            style={{
              ...estiloBotao,
              background:
                '#8b0000',
              marginTop:
                '20px',
            }}
          >
            🗑️ Limpar histórico
          </button>
        )}
      </div>
    </div>
  )
}

const estiloInput = {
  width:
    '100%',
  boxSizing:
    'border-box',
  padding:
    '15px',
  marginBottom:
    '14px',
  borderRadius:
    '8px',
  border:
    '1px solid #999',
  fontSize:
    '18px',
  minHeight:
    '52px',
}

const estiloLabel = {
  display:
    'block',
  fontWeight:
    'bold',
  marginBottom:
    '7px',
  fontSize:
    '18px',
}

const estiloBotao = {
  width:
    '100%',
  padding:
    '15px',
  border:
    'none',
  borderRadius:
    '10px',
  background:
    '#168bd1',
  color:
    'white',
  fontSize:
    '18px',
  fontWeight:
    'bold',
  minHeight:
    '52px',
  cursor:
    'pointer',
}

const botaoSecundario = {
  flex:
    1,
  padding:
    '14px',
  border:
    'none',
  borderRadius:
    '8px',
  cursor:
    'pointer',
  fontSize:
    '18px',
  fontWeight:
    'bold',
  minHeight:
    '52px',
}

export default App
