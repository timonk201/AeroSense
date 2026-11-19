import { useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import './App.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

const stages = [
  { title: 'Подготовка данных', short: 'Данные и ПО', icon: '01' },
  { title: 'Генерация траектории', short: 'Маршрут', icon: '02' },
  { title: 'Управление полётом', short: 'Полёт', icon: '03' },
  { title: 'Обнаружение объектов', short: 'Объекты', icon: '04' },
  { title: 'Создание карты', short: 'Карта', icon: '05' },
  { title: 'Изменение координат', short: 'Координаты', icon: '06' },
  { title: 'Принятие решений', short: 'Решение', icon: '07' },
]

const aiMethods = [
  {
    name: 'Регрессия и SVM',
    tag: 'Машинное обучение',
    purpose: 'Прогноз высоты и скорости по истории полёта.',
    result: 'Пример вывода: прогноз высоты или скорости.',
    insight: 'Регрессия подходит для числового прогноза; SVM помогает отделить безопасный режим от рискованного.',
  },
  {
    name: 'CNN–LSTM',
    tag: 'Глубокое обучение',
    purpose: 'Связать признаки кадров камеры с динамикой БПЛА во времени.',
    result: 'Пример вывода: признаки кадра для оценки положения.',
    insight: 'CNN извлекает признаки изображения, а LSTM учитывает последовательность наблюдений.',
  },
  {
    name: 'Decision Tree, Random Forest, XGBoost',
    tag: 'Деревья решений',
    purpose: 'Классифицировать участок как нормальный или требующий внимания.',
    result: 'Пример вывода: класс состояния участка.',
    insight: 'Деревья дают интерпретируемые правила; ансамбли устойчивее к шумным признакам.',
  },
  {
    name: 'Логика Мамдани',
    tag: 'Нечёткая логика',
    purpose: 'Оценить неопределённые признаки и экспертные правила.',
    result: 'Пример вывода: степень риска по экспертным правилам.',
    insight: 'Нечёткие правила сглаживают переход между режимами, когда наблюдения неоднозначны.',
  },
  {
    name: 'CNN–LSTM + EKF',
    tag: 'Гибридный подход',
    purpose: 'Объединить оценку нейросети с измерениями GPS и датчиков.',
    result: 'Пример вывода: положение с учётом датчиков.',
    insight: 'EKF корректирует прогноз по измерениям и уменьшает шум оценки положения.',
  },
]

const routeOptions = [
  { name: 'Круговая', detail: 'Плавный проход по периметру', type: 'circle' },
  { name: 'Восьмёрка', detail: 'Повторное пересечение центра', type: 'eight' },
  { name: 'Облёт участка', detail: 'Параллельное покрытие поля', type: 'survey' },
]

const sampleDetections = [
  { name: 'Дерево', kind: 'Препятствие', x: 63, y: 29 },
  { name: 'Участок растительности', kind: 'Цель съёмки', x: 37, y: 62 },
  { name: 'Здание', kind: 'Препятствие', x: 78, y: 71 },
]

function Metric({ label, value, note }) {
  return (
    <article className="metric-card">
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      <span className="metric-note">{note}</span>
    </article>
  )
}

function SectionTitle({ title, description }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  )
}

function RouteMap({ routeType = 'survey', moving = false, objects = false, hero = false }) {
  const paths = {
    circle: 'M 126 116 C 126 74 179 56 220 77 C 262 98 257 145 222 162 C 181 181 126 158 126 116 Z',
    eight: 'M 187 118 C 128 48 89 91 119 125 C 149 159 224 80 255 112 C 284 143 242 187 187 118',
    survey: 'M 90 72 L 268 72 L 268 162 L 90 162 Z M 90 102 L 268 102 M 90 132 L 268 132',
  }

  return (
    <div className={`map-visual ${hero ? 'hero-map' : ''}`}>
      <div className="map-topline">
        <span>{hero ? 'План съёмки' : 'Схематичный участок'}</span>
        <span>Не геоданные</span>
      </div>
      <svg className="route-map" viewBox="0 0 360 232" role="img" aria-label="Условная карта участка с маршрутом и положением дрона">
        <defs>
          <pattern id={`grid-${hero ? 'hero' : 'stage'}`} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="var(--map-grid)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="360" height="232" fill={`url(#grid-${hero ? 'hero' : 'stage'})`} />
        <path className="map-water" d="M20 190 C80 175 102 192 137 177 S214 186 244 169 S309 177 343 159" />
        <path className="map-contour" d="M-5 41 C63 12 103 74 164 44 S276 26 364 57" />
        <path className="map-contour" d="M-8 54 C61 26 103 88 164 58 S277 40 368 71" />
        <path className="map-contour" d="M-7 198 C60 167 105 224 173 190 S280 176 368 205" />
        <path className="map-boundary" d="M74 54 L284 44 L300 177 L91 188 Z" />
        <path className="map-route" d={paths[routeType]} strokeDasharray={routeType === 'survey' ? '6 5' : undefined} />
        <circle cx="90" cy="72" r="6" className="map-start" />
        <circle cx="90" cy="72" r="11" className="map-start-ring" />
        <path d="M84 67 L96 77 M96 67 L84 77" className="map-cross" />
        {objects && <>
          <circle cx="226" cy="89" r="8" className="map-object" />
          <circle cx="139" cy="147" r="8" className="map-object" />
          <circle cx="278" cy="145" r="8" className="map-object" />
        </>}
        <g transform={moving ? 'translate(207 117)' : 'translate(90 72)'}>
          <circle r="13" className="map-drone-halo" />
          <circle r="5" className="map-drone" />
          <path d="M-9 0H9M0-9V9" className="map-drone-cross" />
        </g>
        <text x="102" y="61" className="map-label">Старт</text>
        <text x="235" y="213" className="map-small-label">Условный масштаб</text>
      </svg>
      <div className="map-legend">
        <span><i className="legend-line" /> маршрут</span>
        <span><i className="legend-point" /> положение дрона</span>
        {objects && <span><i className="legend-obstacle" /> объект</span>}
      </div>
    </div>
  )
}

function TrendChart({ values, label = 'Прогноз высоты', unit = 'м' }) {
  const styles = getComputedStyle(document.documentElement)
  const color = (token) => styles.getPropertyValue(token).trim()
  const chartColors = {
    green: color('--color-green'),
    greenPale: color('--color-green-pale'),
    ink: color('--color-ink'),
    muted: color('--color-muted'),
    rule: color('--color-rule'),
    paper: color('--color-paper-light'),
    dataFont: color('--font-data'),
  }
  const data = {
    labels: values.map((_, index) => {
      if (index === 0) return 'Начало'
      if (index === Math.floor(values.length / 2)) return 'Середина'
      if (index === values.length - 1) return 'Конец'
      return ''
    }),
    datasets: [{
      data: values,
      borderColor: chartColors.green,
      backgroundColor: chartColors.greenPale,
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 4,
      pointBackgroundColor: chartColors.green,
      fill: true,
      tension: 0.35,
    }],
  }
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        backgroundColor: chartColors.ink,
        titleColor: chartColors.paper,
        bodyColor: chartColors.paper,
        callbacks: { label: (context) => `${context.parsed.y} ${unit}` },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: chartColors.muted, font: { family: chartColors.dataFont, size: 9 }, maxRotation: 0, autoSkip: false },
      },
      y: {
        grid: { color: chartColors.rule },
        border: { display: false },
        ticks: { color: chartColors.muted, font: { family: chartColors.dataFont, size: 9 }, maxTicksLimit: 4, padding: 7 },
      },
    },
  }

  return (
    <div className="chart-card">
      <div className="chart-heading">
        <div><strong>{label}</strong><span>учебный ряд, не прогноз телеметрии</span></div>
        <span className="chart-unit">{unit}</span>
      </div>
      <div className="trend-chart" role="img" aria-label={`${label}: график значений`}>
        <Line data={data} options={options} />
      </div>
    </div>
  )
}

function App() {
  const [activeStage, setActiveStage] = useState(0)
  const [routeType, setRouteType] = useState('survey')
  const [controller, setController] = useState('PID')
  const [isFlying, setIsFlying] = useState(false)
  const [frameReady, setFrameReady] = useState(true)
  const [nir, setNir] = useState(0.52)
  const [red, setRed] = useState(0.21)
  const [origin, setOrigin] = useState({ lat: 55.79, lon: 49.13 })
  const [target, setTarget] = useState({ lat: 55.7903, lon: 49.1341 })
  const [activeMethod, setActiveMethod] = useState(0)

  const ndvi = useMemo(() => (Number(nir) - Number(red)) / (Number(nir) + Number(red)), [nir, red])
  const localCoordinates = useMemo(() => {
    const metersPerDegree = 111320
    const north = (Number(target.lat) - Number(origin.lat)) * metersPerDegree
    const east = (Number(target.lon) - Number(origin.lon)) * metersPerDegree * Math.cos(Number(origin.lat) * Math.PI / 180)
    return { east: east.toFixed(1), north: north.toFixed(1) }
  }, [origin, target])
  const selectedRoute = routeOptions.find((route) => route.type === routeType)

  function navigateTo(index) {
    setActiveStage(index)
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }

  function renderStage() {
    switch (activeStage) {
      case 0:
        return <DataStage />
      case 1:
        return <RouteStage routeType={routeType} setRouteType={setRouteType} selectedRoute={selectedRoute} />
      case 2:
        return <FlightStage controller={controller} setController={setController} isFlying={isFlying} setIsFlying={setIsFlying} routeType={routeType} />
      case 3:
        return <DetectionStage />
      case 4:
        return <MapStage routeType={routeType} isFlying={isFlying} />
      case 5:
        return <CoordinatesStage origin={origin} setOrigin={setOrigin} target={target} setTarget={setTarget} localCoordinates={localCoordinates} />
      default:
        return <DecisionStage
          nir={nir}
          setNir={setNir}
          red={red}
          setRed={setRed}
          ndvi={ndvi}
          frameReady={frameReady}
          setFrameReady={setFrameReady}
          activeMethod={activeMethod}
          setActiveMethod={setActiveMethod}
        />
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); navigateTo(0) }}>
          <span className="brand-name">AeroSense</span>
          <span className="brand-note">Полевой журнал</span>
        </a>
        <div className="topbar-meta"><span>Учебный сценарий</span><span>Без подключения к дрону</span></div>
        <button className="outline-button" type="button" onClick={() => navigateTo(6)}>Открыть анализ</button>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="hero-kicker">Учебная миссия / агромониторинг</p>
          <h1>План полёта начинается с участка.</h1>
          <p>Проследите путь от первого кадра до решения о повторной съёмке растений.</p>
          <button className="primary-button" type="button" onClick={() => navigateTo(0)}>Открыть этапы</button>
        </div>
        <RouteMap routeType={routeType} moving={isFlying} hero />
      </section>

      <div className="workspace">
        <aside className="sidebar">
          <div className="mission-card">
            <span className="mission-label">Сценарий</span>
            <strong>Агромониторинг</strong>
            <span>Схематичный участок</span>
          </div>
          <div className="sidebar-label stages-label">Этапы работы</div>
          <nav className="stage-nav" aria-label="Этапы проекта">
            {stages.map((stage, index) => (
              <button
                type="button"
                key={stage.icon}
                className={`stage-link ${activeStage === index ? 'active' : ''}`}
                onClick={() => navigateTo(index)}
                aria-current={activeStage === index ? 'step' : undefined}
              >
                <span className="stage-number">{stage.icon}</span>
                <span className="stage-link-text"><strong>{stage.title}</strong><small>{stage.short}</small></span>
                {activeStage === index && <span className="stage-arrow">↗</span>}
              </button>
            ))}
          </nav>
          <div className="sidebar-foot">
            <span>Демо-режим</span>
            <strong>Датчики и камера не подключены</strong>
          </div>
        </aside>

        <section className="main-panel">
          <div className="page-heading">
            <div className="breadcrumb">Учебный сценарий / этап {activeStage + 1} из 7</div>
            <div className="page-title-row">
              <h2>{stages[activeStage].title}</h2>
              <span className="step-count">{String(activeStage + 1).padStart(2, '0')} / 07</span>
            </div>
          </div>
          <div className="stage-content" key={activeStage} aria-live="polite">{renderStage()}</div>
          <footer className="stage-footer">
            <button type="button" className="back-button" onClick={() => navigateTo(Math.max(0, activeStage - 1))} disabled={activeStage === 0}>← <span>Назад</span></button>
            <span className="footer-note">Этап {activeStage + 1} из 7</span>
            {activeStage < 6
              ? <button type="button" className="next-button" onClick={() => navigateTo(activeStage + 1)}>Следующий этап</button>
              : <button type="button" className="next-button" onClick={() => navigateTo(0)}>В начало</button>}
          </footer>
        </section>
      </div>
      <footer className="site-footer"><span>AeroSense / Учебная демонстрация</span><span>Без физического подключения</span></footer>
    </main>
  )
}

function DataStage() {
  return (
    <>
      <SectionTitle title="Сначала — достоверные данные." description="Камера, GPS и карта становятся одним набором наблюдений. Перед анализом их синхронизируют и очищают." />
      <div className="metric-grid">
        <Metric label="Изображение" value="RGB и NIR" note="Кадр и спектральные каналы" />
        <Metric label="Положение" value="GPS и IMU" note="Координаты и ориентация" />
        <Metric label="Контекст" value="Карта и цель" note="Границы и маршрут съёмки" />
      </div>
      <p className="demo-note">Источник, частота и объём данных в демонстрации не заданы: реальные камера и датчики не подключены.</p>
      <div className="content-grid data-grid">
        <article className="panel-card">
          <div className="card-heading"><div><span className="section-label">Что поступает в систему</span><h3>Входные источники</h3></div></div>
          <div className="source-list">
            <div className="source-row"><span className="source-icon">Кадр</span><div><strong>Камера и датчики</strong><small>Изображение, высота, скорость, ориентация</small></div><span className="source-value">RGB / NIR</span></div>
            <div className="source-row"><span className="source-icon map-icon">Карта</span><div><strong>Положение и цель</strong><small>Границы участка и точка съёмки</small></div><span className="source-value">Координаты</span></div>
            <div className="source-row"><span className="source-icon gps-icon">GPS</span><div><strong>Навигационные данные</strong><small>Широта, долгота, время и качество сигнала</small></div><span className="source-value">GPS / IMU</span></div>
          </div>
          <div className="data-note"><p>Учебный набор связывает кадр, координаты и метки объектов. Для проверки модели выборки разделяют по времени, чтобы соседние кадры не попали в обе части.</p></div>
        </article>
        <article className="panel-card process-card">
          <div className="card-heading"><div><span className="section-label">Перед запуском модели</span><h3>Подготовка к анализу</h3></div></div>
          <div className="process-list">
            <ProcessRow number="1" title="Фильтрация" text="Удалить шум и единичные выбросы сенсоров." />
            <ProcessRow number="2" title="Нормализация" text="Привести признаки к сопоставимому масштабу." />
            <ProcessRow number="3" title="Коррекция ошибок" text="Сопоставить GPS с IMU и проверить точки." />
            <ProcessRow number="4" title="Обработка кадра" text="OpenCV: цвет, контраст и область интереса." />
          </div>
          <div className="code-snippet"><span>Поля одной записи</span><code>{'{'} frame, timestamp, gps, altitude, labels {'}'}</code></div>
        </article>
      </div>
    </>
  )
}

function ProcessRow({ number, title, text }) {
  return <div className="process-row"><span>{number}</span><div><strong>{title}</strong><small>{text}</small></div></div>
}

function RouteStage({ routeType, setRouteType, selectedRoute }) {
  return (
    <>
      <SectionTitle title="Маршрут с учётом среды." description="Выберите схему облёта. Планировщик должен учитывать цель съёмки, границы участка и препятствия." />
      <div className="content-grid route-grid">
        <article className="panel-card route-card">
          <div className="card-heading"><div><span className="section-label">Учебная география</span><h3>Схема облёта</h3></div></div>
          <RouteMap routeType={routeType} />
          <div className="map-stats"><span>Маршрут <b>{selectedRoute.name}</b></span><span>Препятствия <b>Показаны условно</b></span><span>Масштаб <b>Схематичный</b></span></div>
        </article>
        <article className="panel-card route-options-card">
          <div className="card-heading"><div><span className="section-label">Форма маршрута</span><h3>Выберите вариант</h3></div></div>
          <div className="route-options">
            {routeOptions.map((route) => <button key={route.type} type="button" className={`route-option ${routeType === route.type ? 'selected' : ''}`} onClick={() => setRouteType(route.type)}>
              <span className={`route-icon ${route.type}`}><i /></span>
              <span className="route-option-name"><strong>{route.name}</strong><small>{route.detail}</small></span>
              {routeType === route.type && <span className="route-selected">Выбран</span>}
            </button>)}
          </div>
          <div className="recommendation"><strong>Задача маршрута</strong><p>Покрыть участок снимками и оставить безопасный отступ от препятствий.</p></div>
        </article>
      </div>
      <div className="algorithm-strip"><span>Пример алгоритма</span><b>A* с оценкой стоимости пути</b><span>Ограничения</span><b>Границы и препятствия на схеме</b></div>
    </>
  )
}

function FlightStage({ controller, setController, isFlying, setIsFlying, routeType }) {
  const flightValues = isFlying ? [24, 28, 27, 35, 38, 42, 40, 46, 44, 49, 52] : [21, 25, 24, 30, 34, 33, 39, 42, 40, 45, 48]

  return (
    <>
      <SectionTitle title="Управление полётом" description="Переключите регулятор и запустите визуальную симуляцию. Телеметрия и команды физическому дрону не подключены." />
      <div className="metric-grid">
        <Metric label="Пример высоты" value={isFlying ? '42,0 м' : '0,0 м'} note="Синтетическое значение" />
        <Metric label="Пример скорости" value={isFlying ? '2,4 м/с' : '0,0 м/с'} note="Синтетическое значение" />
        <Metric label="Отклонение" value={isFlying ? '0,4 м' : '—'} note="Не телеметрия реального БПЛА" />
      </div>
      <p className="demo-note">Показатели заданы для иллюстрации интерфейса и не получены с датчиков.</p>
      <div className="content-grid flight-grid">
        <article className="panel-card">
          <div className="card-heading"><div><span className="section-label">Выбор регулятора</span><h3>Режим управления</h3></div></div>
          <div className="segmented-control">
            {['PID', 'PPO'].map((mode) => <button key={mode} type="button" className={controller === mode ? 'selected' : ''} onClick={() => setController(mode)}>{mode}<small>{mode === 'PID' ? 'классический' : 'обучаемый'}</small></button>)}
          </div>
          <div className="controller-info"><strong>{controller === 'PID' ? 'Пропорционально-интегрально-дифференциальный регулятор' : 'Proximal Policy Optimization'}</strong><p>{controller === 'PID' ? 'Исправляет отклонение по текущей, накопленной и прогнозной ошибке. Прост в настройке и предсказуем.' : 'Обученная политика выбирает действие по состоянию дрона и может адаптироваться к сложной траектории.'}</p></div>
          <button className={`mission-button ${isFlying ? 'stop' : ''}`} type="button" onClick={() => setIsFlying(!isFlying)}>{isFlying ? 'Завершить симуляцию' : 'Запустить симуляцию'} <span>{isFlying ? '■' : '→'}</span></button>
          <p className="simulation-warning">Визуальная симуляция; команда полёта не отправляется.</p>
        </article>
        <div className="flight-chart-column">
          <RouteMap routeType={routeType} moving={isFlying} />
          <TrendChart values={flightValues} label="Пример профиля высоты" />
        </div>
      </div>
    </>
  )
}

function DetectionStage() {
  const [frameIndex, setFrameIndex] = useState(0)
  const [showDetections, setShowDetections] = useState(true)
  const frame = sampleDetections[frameIndex % sampleDetections.length]

  return (
    <>
      <SectionTitle title="Что попало в кадр?" description="Реальный детектор YOLOv8 может находить цели съёмки и препятствия. Здесь показан учебный пример разметки." />
      <div className="content-grid detection-grid">
        <article className="panel-card camera-card">
          <div className="card-heading"><div><span className="section-label">Синтетический кадр</span><h3>Пример разметки объектов</h3></div></div>
          <div className="camera-view">
            <div className="field-sky"><span className="sun-disc" /></div>
            <div className="field-horizon" />
            <div className="field-ground"><i /><i /><i /><i /><i /></div>
            {showDetections && <><div className="detection-box box-tree"><span>Дерево</span></div><div className="detection-box box-crop"><span>Растительность</span></div><div className="detection-box box-building"><span>Здание</span></div></>}
            <span className="camera-crosshair" />
            <span className="camera-coords">Условный кадр / пример</span>
          </div>
          <div className="camera-actions">
            <span>{showDetections ? 'Три учебные метки' : 'Метки скрыты'}</span>
            <button type="button" className="text-button" onClick={() => setShowDetections(!showDetections)}>{showDetections ? 'Скрыть рамки' : 'Показать рамки'}</button>
          </div>
        </article>
        <article className="panel-card detections-card">
          <div className="card-heading"><div><span className="section-label">Демо-список</span><h3>Классы объектов</h3></div></div>
          <div className="object-list">
            {sampleDetections.map((detection, index) => <button type="button" key={detection.name} className={`object-row ${frameIndex === index ? 'focused' : ''}`} onClick={() => setFrameIndex(index)}>
              <span className={`object-dot object-${index}`} />
              <span className="object-info"><strong>{detection.name}</strong><small>{detection.kind}</small></span>
              <span className="object-position">x {detection.x}% / y {detection.y}%</span>
            </button>)}
          </div>
          <div className="object-detail"><span>Выбран объект: {frame.name}</span><strong>{frame.kind === 'Препятствие' ? 'Внести в карту препятствий' : 'Добавить в область наблюдения'}</strong><small>Пиксельные координаты приведены как пример.</small></div>
        </article>
      </div>
    </>
  )
}

function MapStage({ routeType, isFlying }) {
  const selectedRoute = routeOptions.find((route) => route.type === routeType)

  return (
    <>
      <SectionTitle title="Собрать наблюдения в карту." description="SLAM сопоставляет кадры и показания датчиков, чтобы оценивать положение дрона и отмечать объекты." />
      <div className="content-grid mapping-grid">
        <article className="panel-card mapping-card">
          <div className="card-heading"><div><span className="section-label">Схематичное представление</span><h3>План участка и объекты</h3></div></div>
          <RouteMap routeType={routeType} moving={isFlying} objects />
          <div className="map-stats"><span>Положение <b>{isFlying ? 'Дрон в движении' : 'Точка старта'}</b></span><span>Маршрут <b>{selectedRoute.name}</b></span><span>Примечание <b>Не геоданные</b></span></div>
        </article>
        <article className="panel-card map-result">
          <span className="section-label">Как читать схему</span>
          <h3>Слои локальной карты</h3>
          <p>Это макет результата SLAM, а не построенная по сенсорам карта.</p>
          <div className="result-list"><span>Положение дрона <b>{isFlying ? 'в движении' : 'точка старта'}</b></span><span>Обнаружено препятствий <b>2 объекта</b></span><span>Система координат <b>локальная ENU</b></span></div>
          <p className="map-note">Для настоящей карты нужны кадры с камеры, GPS и данные IMU.</p>
        </article>
      </div>
      <div className="result-banner"><span>В демонстрации показаны</span><strong>маршрут</strong><strong>объектные метки</strong><strong>{isFlying ? 'движение дрона' : 'точка старта'}</strong></div>
    </>
  )
}

function CoordinatesStage({ origin, setOrigin, target, setTarget, localCoordinates }) {
  const updateCoordinate = (setter, state, key, value) => setter({ ...state, [key]: value })

  return (
    <>
      <SectionTitle title="GPS — в координаты движения." description="Пересчитайте географические координаты в локальную плоскую систему ENU: восток и север относительно выбранной точки старта." />
      <p className="demo-note">Начальные координаты заданы для примера; GPS-приёмник не подключён.</p>
      <div className="content-grid coordinates-grid">
        <article className="panel-card coordinate-input-card">
          <div className="card-heading"><div><span className="section-label">WGS 84 в локальную ENU</span><h3>Параметры преобразования</h3></div></div>
          <div className="coordinate-group"><div className="coordinate-group-title"><span>1</span><strong>Точка старта — начало отсчёта</strong></div><div className="coordinate-fields"><CoordinateInput label="Широта" value={origin.lat} onChange={(value) => updateCoordinate(setOrigin, origin, 'lat', value)} /><CoordinateInput label="Долгота" value={origin.lon} onChange={(value) => updateCoordinate(setOrigin, origin, 'lon', value)} /></div></div>
          <div className="coordinate-group"><div className="coordinate-group-title"><span>2</span><strong>Текущее положение</strong></div><div className="coordinate-fields"><CoordinateInput label="Широта" value={target.lat} onChange={(value) => updateCoordinate(setTarget, target, 'lat', value)} /><CoordinateInput label="Долгота" value={target.lon} onChange={(value) => updateCoordinate(setTarget, target, 'lon', value)} /></div></div>
          <div className="formula-block"><span>Приближение для коротких расстояний</span><code>E ≈ Δλ · 111 320 · cos(φ₀); N ≈ Δφ · 111 320</code></div>
        </article>
        <article className="panel-card coordinate-output-card">
          <span className="section-label">Локальная система координат</span>
          <div className="coordinate-axis"><span className="axis-north">N <i>↑</i></span><span className="axis-east">E <i>→</i></span><span className="axis-origin">0, 0</span><span className="axis-position" /></div>
          <div className="coordinate-output"><span>Восток (E)</span><strong>{localCoordinates.east}<small>м</small></strong></div>
          <div className="coordinate-output"><span>Север (N)</span><strong>{localCoordinates.north}<small>м</small></strong></div>
          <p className="precision-note">Плоское приближение подходит для небольших участков. Для точных расчётов учитывайте высоту и кривизну Земли.</p>
        </article>
      </div>
    </>
  )
}

function CoordinateInput({ label, value, onChange }) {
  return <label className="coordinate-input"><span>{label}</span><input type="number" step="0.0001" value={value} onChange={(event) => onChange(event.target.value)} /></label>
}

function DecisionStage({ nir, setNir, red, setRed, ndvi, frameReady, setFrameReady, activeMethod, setActiveMethod }) {
  const stressed = ndvi < 0.35
  const percent = Math.max(0, Math.min(100, ((ndvi + 1) / 2) * 100))

  return (
    <>
      <SectionTitle title="Наблюдать, оценивать, действовать." description="Пример контура обработки: кадр и навигационные данные анализируются, а NDVI помогает показать возможное состояние растительности. Модели и датчики в этой демонстрации не запускаются." />
      <div className="content-grid decision-grid">
        <article className="panel-card ndvi-card">
          <div className="card-heading"><div><span className="section-label">Учебные спектральные значения</span><h3>Калькулятор NDVI</h3></div></div>
          <p className="ndvi-intro">Измените отражение в красном и ближнем инфракрасном диапазонах, чтобы увидеть, как меняется оценка состояния растительности.</p>
          <div className="ndvi-inputs">
            <RangeInput label="NIR — ближний инфракрасный" value={nir} setValue={setNir} color="green" />
            <RangeInput label="Красный диапазон" value={red} setValue={setRed} color="red" />
          </div>
          <div className="ndvi-equation"><span>NDVI =</span><span className="fraction"><b>NIR − Red</b><i /><b>NIR + Red</b></span><span className="equation-equals">=</span><strong>{ndvi.toFixed(2)}</strong></div>
          <div className="ndvi-scale"><div className="scale-labels"><span>−1: вода и облака</span><span>0: почва</span><span>+1: растительность</span></div><div className="scale-track"><i style={{ left: `${percent}%` }} /></div></div>
          <div className={`stress-result ${stressed ? 'stress' : 'healthy'}`}><div><span>Учебный порог: NDVI 0,35</span><strong>{stressed ? 'Возможен фитостресс' : 'Порог фитостресса не достигнут'}</strong><small>{stressed ? 'Рекомендуется повторно осмотреть участок и передать решение оператору.' : 'По этому примеру дополнительная съёмка не предлагается.'}</small></div></div>
          <p className="data-disclaimer">Демонстрационные спектральные значения. Реальное заключение требует калиброванной мультиспектральной камеры.</p>
        </article>
        <div className="decision-column">
          <article className="panel-card flow-card">
            <div className="card-heading"><div><span className="section-label">Концептуальная схема</span><h3>Контур принятия решений</h3></div></div>
            <div className="flow-list">
              <FlowStep number="1" title="Получить кадр камеры" detail={frameReady ? 'Для схемы выбран учебный кадр.' : 'В примере кадр отсутствует.'} action={<button className="mini-toggle" type="button" onClick={() => setFrameReady(!frameReady)}>{frameReady ? 'Показать отсутствие кадра' : 'Восстановить учебный кадр'}</button>} />
              <FlowStep number="2" title="Найти объект или аномалию" detail={frameReady ? 'Пример этапа детекции YOLOv8.' : 'Анализ ждёт кадр.'} />
              <FlowStep number="3" title="Объединить изображение и датчики" detail="Возможный метод: CNN–LSTM и EKF." />
              <FlowStep number="4" title="Предложить следующее действие" detail={stressed ? 'Повторно осмотреть участок.' : 'Продолжить плановый анализ.'} last />
            </div>
            <div className="feedback-loop">Эта схема описывает концепцию, а не работающий контур управления.</div>
          </article>
          <article className="panel-card model-card">
            <div className="card-heading"><div><span className="section-label">Возможные методы ИИ</span><h3>Пример применения</h3></div></div>
            <div className="method-tabs">{aiMethods.map((method, index) => <button type="button" key={method.name} className={activeMethod === index ? 'active' : ''} onClick={() => setActiveMethod(index)} aria-label={method.name}>{String(index + 1).padStart(2, '0')}</button>)}</div>
            <div className="method-description"><span>{aiMethods[activeMethod].tag}</span><strong>{aiMethods[activeMethod].name}</strong><p>{aiMethods[activeMethod].purpose}</p></div>
            <div className="training-result"><span>Возможный результат</span><strong>{aiMethods[activeMethod].result}</strong><small>{aiMethods[activeMethod].insight}</small></div>
          </article>
        </div>
      </div>
      <div className="content-grid result-grid">
        <TrendChart values={[31, 32, 34, 33, 36, 38, 37, 41, 43, 42, 46]} label="Синтетический профиль высоты" unit="м" />
        <article className="panel-card training-card"><span className="section-label">Что потребуется для обучения</span><h3>Датасет и разметка</h3><div className="training-needs"><span>Кадры камеры<b>Не загружены</b></span><span>Метки объектов<b>Не заданы</b></span><span>Обучение модели<b>Не запускалось</b></span></div><p>Значения на графике и в примерах заданы вручную для демонстрации интерфейса.</p></article>
      </div>
      <div className="decision-summary"><span>Условная рекомендация</span><strong>{!frameReady ? 'Сначала получить кадр' : stressed ? 'Повторно осмотреть участок' : 'Продолжить анализ по плану'}</strong><p>Результат зависит от учебного порога NDVI и наличия примера кадра. Это не команда дрону.</p></div>
    </>
  )
}

function RangeInput({ label, value, setValue, color }) {
  return <label className={`range-input ${color}`}><span>{label}<b>{Number(value).toFixed(2)}</b></span><input type="range" min="0.05" max="0.9" step="0.01" value={value} onChange={(event) => setValue(Number(event.target.value))} /></label>
}

function FlowStep({ number, title, detail, action, last = false }) {
  return <div className={`flow-step ${last ? 'last' : ''}`}><span className="flow-number">{number}</span><div><strong>{title}</strong><small>{detail}</small>{action}</div></div>
}

export default App
