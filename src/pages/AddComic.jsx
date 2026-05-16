import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import { supabase } from '../services/supabaseClient'
import CameraScanner from '../components/CameraScanner'
import { parseComicBarcode, fetchComicData, mapToFormState } from '../utils/barcode'

const emptyForm = {
  title: '',
  issue: '',
  publisher: '',
  year: '',
  condition: '9.2',
  variant: false,
  purchasePrice: '',
  estimatedValue: '',
  notes: '',
}

const conditionLabels = {
  '10.0': 'Gem Mint',
  '9.9': 'Mint',
  '9.8': 'Near Mint / Mint',
  '9.6': 'Near Mint +',
  '9.4': 'Near Mint',
  '9.2': 'Near Mint',
  '9.0': 'Very Fine / Near Mint',
  '8.5': 'Very Fine +',
  '8.0': 'Very Fine',
  '7.5': 'Very Fine',
  '7.0': 'Fine / Very Fine',
  '6.5': 'Fine +',
  '6.0': 'Fine',
  '5.5': 'Fine',
  '5.0': 'Very Good / Fine',
  '4.5': 'Very Good +',
  '4.0': 'Very Good',
  '3.5': 'Very Good',
  '3.0': 'Good / Very Good',
  '2.5': 'Good +',
  '2.0': 'Good',
  '1.8': 'Good',
  '1.5': 'Fair / Good',
  '1.0': 'Fair',
  '0.5': 'Poor',
}

const conditionValues = Object.keys(conditionLabels).reverse()

export default function AddComic() {
  const location = useLocation()
  const navigate = useNavigate()
  const editComic = location.state?.comic || null
  const isEditing = !!editComic

  const [tab, setTab] = useState('manual')
  const [form, setForm] = useState(editComic ? {
    title: editComic.title || '',
    issue: editComic.issue || '',
    publisher: editComic.publisher || '',
    year: editComic.year || '',
    condition: editComic.condition || '9.2',
    variant: editComic.variant || false,
    purchasePrice: editComic.purchasePrice || editComic.purchase_price || '',
    estimatedValue: editComic.estimatedValue || editComic.estimated_value || '',
    notes: editComic.notes || '',
  } : emptyForm)
  const [aiInput, setAiInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [listening, setListening] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState('')
  const [frontCoverUrl, setFrontCoverUrl] = useState(null)
  const [backCoverUrl, setBackCoverUrl] = useState(null)
  const fileInputRef = useRef(null)
  const recognitionRef = useRef(null)

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    const record = {
      id: isEditing ? editComic.id : Date.now(),
      title: form.title,
      issue: form.issue,
      publisher: form.publisher,
      year: form.year,
      condition: form.condition,
      variant: form.variant,
      purchase_price: form.purchasePrice,
      estimated_value: form.estimatedValue,
      notes: form.notes,
      cover_front_url: frontCoverUrl,
      cover_back_url: backCoverUrl,
    }

    if (isEditing) {
      await supabase.from('comics').update(record).eq('id', editComic.id)
    } else {
      await supabase.from('comics').insert(record)
    }

    setSaved(true)
    setForm(emptyForm)
    setImagePreview(null)
    setImageBase64(null)
    setImageFile(null)
    setFrontCoverUrl(null)
    setBackCoverUrl(null)
    setTimeout(() => {
      setSaved(false)
      if (isEditing) navigate('/inventory')
    }, 1500)
  }

  async function handleAiAssist() {
    if (!aiInput.trim()) return
    setLoading(true)
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Extract comic book details from this text and return ONLY a JSON object with these exact fields: title, issue, publisher, year, condition, variant (true/false), purchasePrice, estimatedValue, notes. If a field is unknown leave it as empty string. Condition should be a CGC grade number like 9.8. Text: ${aiInput}`
          }]
        })
      })
      const data = await response.json()
      const text = data.content[0].text
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setForm(prev => ({ ...prev, ...parsed }))
      setTab('manual')
    } catch (err) {
      console.error('AI assist error:', err)
    }
    setLoading(false)
  }

  async function processVoiceWithClaude(transcript) {
    setVoiceStatus('READING...')
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Extract comic book details from this spoken description and return ONLY a JSON object with these exact fields: title, issue, publisher, year, condition, variant (true/false), purchasePrice, estimatedValue, notes. If a field is unknown leave it as empty string. Condition should be a CGC grade number like 9.8. Spoken text: ${transcript}`
          }]
        })
      })
      const data = await response.json()
      const text = data.content[0].text
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setForm(prev => ({ ...prev, ...parsed }))
      setVoiceStatus('DONE')
      setTimeout(() => setVoiceStatus(''), 2000)
    } catch (err) {
      console.error('Voice processing error:', err)
      setVoiceStatus('')
    }
  }

  async function handleImageAssist() {
    if (!imageBase64) return
    setLoading(true)
    try {
      const mediaType = imageFile?.type || 'image/jpeg'
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: imageBase64 }
              },
              {
                type: 'text',
                text: 'This is a comic book cover. Extract all visible details and return ONLY a JSON object with these exact fields: title, issue, publisher, year, condition, variant (true/false), purchasePrice, estimatedValue, notes. Estimate condition from visible wear. Leave unknown fields as empty string.'
              }
            ]
          }]
        })
      })
      const data = await response.json()
      const text = data.content[0].text
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setForm(prev => ({ ...prev, ...parsed }))
      setTab('manual')
    } catch (err) {
      console.error('Image assist error:', err)
    }
    setLoading(false)
  }

  async function handleBarcodeScan(rawCode) {
    const parsed = parseComicBarcode(rawCode)
    if (parsed.error) return
    setLoading(true)
    const comicData = await fetchComicData(parsed)
    if (comicData) setForm(prev => ({ ...prev, ...mapToFormState(comicData) }))
    setLoading(false)
    setTab('manual')
  }

  function startListening() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser. Try Chrome.')
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onstart = () => setListening(true)
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setVoiceStatus('HEARD: ' + transcript)
      processVoiceWithClaude(transcript)
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => { setListening(false); setVoiceStatus('') }
    recognition.start()
  }

  function stopListening() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      setImageBase64(base64)
      setImagePreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const inputStyle = {
    width: '100%',
    background: 'var(--surface2)',
    border: '1px solid #333',
    borderRadius: '6px',
    padding: '0.65rem 0.75rem',
    color: 'var(--text)',
    fontFamily: 'Inter, sans-serif',
    fontSize: '0.9rem',
    outline: 'none',
  }

  const labelStyle = {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '0.65rem',
    color: 'var(--muted)',
    letterSpacing: '0.1em',
    marginBottom: '0.35rem',
    display: 'block',
  }

  const MicButton = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1.25rem 0' }}>
      <button
        onClick={listening ? stopListening : startListening}
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          border: `3px solid ${listening ? 'var(--red)' : 'var(--gold)'}`,
          background: listening ? 'var(--red)' : 'var(--surface2)',
          color: listening ? 'white' : 'var(--gold)',
          fontSize: '2rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          boxShadow: listening ? '0 0 30px rgba(192,57,43,0.4)' : '0 0 20px rgba(201,169,110,0.2)',
        }}
      >
        {listening ? '⏹' : '🎙'}
      </button>
      <p style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '0.65rem',
        color: listening ? 'var(--gold)' : 'var(--muted)',
        letterSpacing: '0.1em',
      }}>
        {listening ? 'LISTENING...' : voiceStatus === 'READING...' ? 'READING...' : voiceStatus === 'DONE' ? 'FIELDS FILLED' : 'TAP TO SPEAK'}
      </p>
    </div>
  )

  const tabs = ['manual', 'scan', 'ai', 'voice']

  return (
    <AppShell>
      {tab === 'scan' && !isEditing && (
        <CameraScanner
          onScanComplete={(formData, frontUrl, backUrl) => {
            setForm(prev => ({ ...prev, ...formData }))
            if (frontUrl) setFrontCoverUrl(frontUrl)
            if (backUrl) setBackCoverUrl(backUrl)
            setTab('manual')
          }}
          onClose={() => setTab('manual')}
        />
      )}

      <div style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>

        <h2 style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: '1.4rem',
          color: 'var(--gold)',
          marginBottom: '1.5rem',
          letterSpacing: '0.05em',
        }}>
          {isEditing ? 'EDIT COMIC' : 'ADD COMIC'}
        </h2>

        {!isEditing && (
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            borderBottom: '1px solid #333',
            paddingBottom: '0.75rem',
          }}>
            {tabs.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.7rem',
                  letterSpacing: '0.1em',
                  padding: '0.4rem 1rem',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  background: tab === t ? 'var(--gold)' : 'var(--surface2)',
                  color: tab === t ? 'var(--ink)' : 'var(--muted)',
                  fontWeight: tab === t ? 700 : 400,
                }}
              >
                {t === 'manual' ? 'MANUAL' : t === 'scan' ? '▦ SCAN' : t === 'ai' ? 'AI ASSIST' : '🎙 VOICE'}
              </button>
            ))}
          </div>
        )}

        {/* Cover thumbnails from scan */}
        {(frontCoverUrl || backCoverUrl) && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {frontCoverUrl && (
              <div style={{ flex: 1 }}>
                <p style={{ ...labelStyle, marginBottom: '0.4rem' }}>FRONT COVER</p>
                <img src={frontCoverUrl} alt="Front cover" style={{ width: '100%', borderRadius: '6px', border: '1px solid var(--gold)', objectFit: 'cover', maxHeight: '180px' }} />
              </div>
            )}
            {backCoverUrl && (
              <div style={{ flex: 1 }}>
                <p style={{ ...labelStyle, marginBottom: '0.4rem' }}>BACK COVER</p>
                <img src={backCoverUrl} alt="Back cover" style={{ width: '100%', borderRadius: '6px', border: '1px solid #333', objectFit: 'cover', maxHeight: '180px' }} />
              </div>
            )}
          </div>
        )}

        {/* VOICE TAB */}
        {tab === 'voice' && !isEditing && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '2rem 0' }}>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.6, textAlign: 'center' }}>
              Tap the mic and describe the comic. Claude will fill in all the fields automatically.
            </p>
            <button
              onClick={listening ? stopListening : startListening}
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                border: `3px solid ${listening ? 'var(--red)' : 'var(--gold)'}`,
                background: listening ? 'var(--red)' : 'var(--surface2)',
                color: listening ? 'white' : 'var(--gold)',
                fontSize: '2.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                boxShadow: listening ? '0 0 30px rgba(192,57,43,0.4)' : '0 0 20px rgba(201,169,110,0.2)',
              }}
            >
              {listening ? '⏹' : '🎙'}
            </button>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: listening ? 'var(--gold)' : 'var(--muted)', letterSpacing: '0.1em' }}>
              {listening ? 'LISTENING...' : voiceStatus || 'TAP TO SPEAK'}
            </p>
            {voiceStatus && voiceStatus.startsWith('HEARD') && (
              <div style={{ background: 'var(--surface2)', border: '1px solid #333', borderRadius: '6px', padding: '0.75rem', width: '100%' }}>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', color: 'var(--muted)', marginBottom: '0.35rem' }}>TRANSCRIPT</p>
                <p style={{ color: 'var(--text)', fontSize: '0.85rem' }}>{voiceStatus.replace('HEARD: ', '')}</p>
              </div>
            )}
            {voiceStatus === 'DONE' && (
              <button onClick={() => setTab('manual')} style={{ background: 'var(--success)', color: 'var(--ink)', border: 'none', borderRadius: '6px', padding: '0.65rem 1.5rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                REVIEW FIELDS
              </button>
            )}
          </div>
        )}

        {/* AI ASSIST TAB */}
        {tab === 'ai' && !isEditing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {imagePreview && (
              <div style={{ position: 'relative' }}>
                <img src={imagePreview} alt="Comic cover" style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '6px', border: '1px solid var(--gold)' }} />
                <button onClick={() => { setImagePreview(null); setImageBase64(null); setImageFile(null) }} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'var(--red)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>X</button>
              </div>
            )}
            {!imagePreview && (
              <div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                <button onClick={() => fileInputRef.current.click()} style={{ width: '100%', background: 'var(--surface2)', border: '2px dashed var(--gold)', borderRadius: '6px', padding: '2rem', color: 'var(--gold)', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.05em', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '2rem' }}>📷</span>
                  SCAN COVER
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)', fontWeight: 400 }}>CAMERA OR PHOTO LIBRARY</span>
                </button>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ flex: 1, height: '1px', background: '#333' }} />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)' }}>OR DESCRIBE IT</span>
              <div style={{ flex: 1, height: '1px', background: '#333' }} />
            </div>
            <textarea value={aiInput} onChange={e => setAiInput(e.target.value)} placeholder="Amazing Spider-Man 300, first appearance Venom, 1988, Marvel. condition about 8.0, picked it up for $200..." rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
            <button onClick={imagePreview ? handleImageAssist : handleAiAssist} disabled={loading} style={{ background: 'var(--gold)', color: 'var(--ink)', border: 'none', borderRadius: '6px', padding: '0.75rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.05em', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'READING...' : imagePreview ? 'READ COVER' : 'EXTRACT DETAILS'}
            </button>
          </div>
        )}

        {/* MANUAL TAB */}
        {(tab === 'manual' || isEditing) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {!isEditing && <MicButton />}
            {!isEditing && <div style={{ height: '1px', background: '#2a2a27' }} />}

            <div>
              <label style={labelStyle}>TITLE</label>
              <input style={inputStyle} value={form.title} onChange={e => handleChange('title', e.target.value)} placeholder="Amazing Spider-Man" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>ISSUE</label>
                <input style={inputStyle} value={form.issue} onChange={e => handleChange('issue', e.target.value)} placeholder="300" />
              </div>
              <div>
                <label style={labelStyle}>YEAR</label>
                <input style={inputStyle} value={form.year} onChange={e => handleChange('year', e.target.value)} placeholder="1988" />
              </div>
            </div>

            <div>
              <label style={labelStyle}>PUBLISHER</label>
              <input style={inputStyle} value={form.publisher} onChange={e => handleChange('publisher', e.target.value)} placeholder="Marvel" />
            </div>

            <div>
              <label style={labelStyle}>CONDITION: {form.condition} — {conditionLabels[form.condition] || ''}</label>
              <input type="range" min={0} max={conditionValues.length - 1} value={conditionValues.indexOf(form.condition)} onChange={e => handleChange('condition', conditionValues[e.target.value])} style={{ width: '100%', accentColor: 'var(--gold)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                <span style={{ ...labelStyle, margin: 0 }}>POOR 0.5</span>
                <span style={{ ...labelStyle, margin: 0 }}>GEM MINT 10.0</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>PURCHASE PRICE</label>
                <input style={inputStyle} value={form.purchasePrice} onChange={e => handleChange('purchasePrice', e.target.value)} placeholder="200" />
              </div>
              <div>
                <label style={labelStyle}>EST. VALUE</label>
                <input style={inputStyle} value={form.estimatedValue} onChange={e => handleChange('estimatedValue', e.target.value)} placeholder="450" />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface2)', padding: '0.75rem', borderRadius: '6px' }}>
              <span style={labelStyle}>VARIANT COVER</span>
              <div onClick={() => handleChange('variant', !form.variant)} style={{ width: '44px', height: '24px', borderRadius: '12px', background: form.variant ? 'var(--gold)' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: '3px', left: form.variant ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>NOTES</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} value={form.notes} onChange={e => handleChange('notes', e.target.value)} placeholder="First appearance Venom. Key issue." rows={3} />
            </div>

            <button onClick={handleSave} style={{ background: saved ? 'var(--success)' : 'var(--gold)', color: 'var(--ink)', border: 'none', borderRadius: '6px', padding: '0.85rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.05em', cursor: 'pointer', transition: 'background 0.3s' }}>
              {saved ? 'SAVED' : isEditing ? 'UPDATE COMIC' : 'SAVE TO COLLECTION'}
            </button>

          </div>
        )}

      </div>
    </AppShell>
  )
}
