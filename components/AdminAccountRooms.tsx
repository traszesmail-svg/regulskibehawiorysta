'use client'

import { useState } from 'react'
import { Download, MessageCircle, PawPrint, RefreshCw, Send } from 'lucide-react'
import type { AccountAdminRoom } from '@/lib/server/account-store'

type AdminAccountRoomsProps = {
  rooms: AccountAdminRoom[]
}

function formatDateTime(value: string | null) {
  if (!value) return 'brak'

  try {
    return new Intl.DateTimeFormat('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

export function AdminAccountRooms({ rooms }: AdminAccountRoomsProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [closing, setClosing] = useState<Record<string, boolean>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function submit(userId: string, conversationId: string) {
    const key = `${userId}:${conversationId}`
    setLoadingId(key)
    setError('')

    try {
      const response = await fetch(`/api/admin/account/conversations/${encodeURIComponent(userId)}/${encodeURIComponent(conversationId)}/reply`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: drafts[key] ?? '',
          closeConversation: closing[key] === true,
        }),
      })
      const payload = (await response.json()) as { ok?: boolean; error?: string }

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Nie udało się zapisać odpowiedzi.')
      }

      window.location.reload()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Nie udało się zapisać odpowiedzi.')
    } finally {
      setLoadingId(null)
    }
  }

  if (rooms.length === 0) {
    return (
      <section className="admin-account-empty">
        <MessageCircle size={22} aria-hidden="true" />
        <h2>Brak kont opiekunów</h2>
        <p>Po pierwszym logowaniu klienta jego pokój pojawi się tutaj.</p>
      </section>
    )
  }

  return (
    <div className="admin-account-rooms">
      {error ? <div className="admin-account-error">{error}</div> : null}
      <div className="admin-account-toolbar">
        <span>{rooms.length} kont</span>
        <button type="button" className="button button-ghost small-button" onClick={() => window.location.reload()}>
          <RefreshCw size={15} aria-hidden="true" />
          Odśwież
        </button>
      </div>

      {rooms.map((room) => (
        <article key={room.userId} className="admin-account-room">
          <header className="admin-account-room-head">
            <div>
              <span className="admin-account-kicker">{room.email}</span>
              <h2>{room.pets[0]?.name ? `Pokój: ${room.pets[0].name}` : 'Pokój opiekuna'}</h2>
              <p>Ostatnia aktywność: {formatDateTime(room.updatedAt)}</p>
            </div>
            <div className="admin-account-stats">
              <span>{room.pets.length} pupili</span>
              <span>{room.bookings.length} rezerwacji</span>
              <span>{room.materials.length} materiałów</span>
              <span>{room.messageCount} wiadomości</span>
            </div>
          </header>

          {room.pets.length > 0 ? (
            <div className="admin-account-pets">
              {room.pets.map((pet) => (
                <div key={pet.id} className="admin-account-pet">
                  {pet.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- private Supabase signed URL, not a stable image domain.
                    <img src={pet.photoUrl} alt="" />
                  ) : <span><PawPrint size={22} aria-hidden="true" /></span>}
                  <div>
                    <strong>{pet.name}</strong>
                    <small>{pet.species === 'kot' ? 'Kot' : 'Pies'} {pet.age ? `- ${pet.age}` : ''}</small>
                    {pet.behaviorNotes ? <p>{pet.behaviorNotes}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="admin-account-lists">
            {room.bookings.length > 0 ? (
              <section>
                <h3>Rezerwacje</h3>
                {room.bookings.slice(0, 4).map((booking) => (
                  <p key={`${booking.source}:${booking.id}`}>
                    <strong>{booking.title}</strong><br />
                    {booking.dateLabel} · {booking.statusLabel} · {booking.paymentLabel}
                  </p>
                ))}
              </section>
            ) : null}

            {room.materials.length > 0 ? (
              <section>
                <h3>Materiały</h3>
                {room.materials.slice(0, 4).map((material) => (
                  <p key={material.orderNumber}>
                    <strong>{material.productName}</strong><br />
                    {material.statusLabel}
                  </p>
                ))}
              </section>
            ) : null}
          </div>

          <div className="admin-account-conversations">
            {room.conversations.length === 0 ? (
              <div className="admin-account-empty-inline">Brak rozmów w pokoju.</div>
            ) : null}

            {room.conversations.map((conversation) => {
              const key = `${room.userId}:${conversation.id}`
              return (
                <section key={conversation.id} className="admin-account-conversation">
                  <div className="admin-account-conversation-head">
                    <div>
                      <h3>{conversation.subject}</h3>
                      <p>Status: {conversation.status === 'closed' ? 'zamknięta' : 'otwarta'} · {formatDateTime(conversation.updatedAt)}</p>
                    </div>
                  </div>

                  <div className="admin-account-messages">
                    {conversation.messages.map((message) => (
                      <div key={message.id} className={`admin-account-message is-${message.sender}`}>
                        <small>{message.sender === 'customer' ? 'Klient' : message.sender === 'specialist' ? 'Specjalista' : 'System'} · {formatDateTime(message.createdAt)}</small>
                        {message.body ? <p>{message.body}</p> : null}
                        {message.attachments.map((attachment) => (
                          <a key={attachment.id} href={attachment.signedUrl ?? '#'} target="_blank" rel="noopener noreferrer">
                            <Download size={14} aria-hidden="true" />
                            {attachment.fileName} ({formatBytes(attachment.fileSizeBytes)})
                          </a>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="admin-account-reply">
                    <textarea
                      value={drafts[key] ?? ''}
                      onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))}
                      rows={4}
                      placeholder="Odpowiedz klientowi..."
                    />
                    <label>
                      <input
                        type="checkbox"
                        checked={closing[key] === true}
                        onChange={(event) => setClosing((current) => ({ ...current, [key]: event.target.checked }))}
                      />
                      Zamknij rozmowę po odpowiedzi
                    </label>
                    <button type="button" className="button button-primary small-button" onClick={() => submit(room.userId, conversation.id)} disabled={loadingId !== null}>
                      <Send size={15} aria-hidden="true" />
                      {loadingId === key ? 'Wysyłam...' : 'Zapisz i powiadom'}
                    </button>
                  </div>
                </section>
              )
            })}
          </div>
        </article>
      ))}

      <style jsx>{`
        .admin-account-rooms {
          display: grid;
          gap: 18px;
        }

        .admin-account-toolbar,
        .admin-account-room-head,
        .admin-account-conversation-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .admin-account-toolbar {
          align-items: center;
          color: rgba(31, 26, 23, 0.68);
          font-size: 14px;
        }

        .admin-account-room,
        .admin-account-empty {
          border: 1px solid rgba(92, 76, 58, 0.16);
          background: #fffaf2;
          border-radius: 8px;
          padding: 18px;
        }

        .admin-account-empty,
        .admin-account-empty-inline {
          color: rgba(31, 26, 23, 0.68);
        }

        .admin-account-error {
          border: 1px solid rgba(138, 48, 34, 0.24);
          background: #fff4ef;
          border-radius: 8px;
          padding: 12px 14px;
          color: #8a3022;
        }

        .admin-account-kicker {
          display: block;
          color: rgba(31, 26, 23, 0.58);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .admin-account-room h2,
        .admin-account-conversation h3 {
          margin: 4px 0 4px;
        }

        .admin-account-room p {
          margin: 0;
          color: rgba(31, 26, 23, 0.72);
        }

        .admin-account-stats {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 6px;
        }

        .admin-account-stats span {
          border: 1px solid rgba(92, 76, 58, 0.16);
          border-radius: 999px;
          padding: 6px 9px;
          background: #ffffff;
          font-size: 12px;
        }

        .admin-account-pets,
        .admin-account-lists,
        .admin-account-conversations {
          margin-top: 16px;
        }

        .admin-account-pet {
          display: grid;
          grid-template-columns: 64px minmax(0, 1fr);
          gap: 12px;
          align-items: start;
          border-top: 1px solid rgba(92, 76, 58, 0.12);
          padding-top: 14px;
        }

        .admin-account-pet img,
        .admin-account-pet > span {
          width: 64px;
          height: 64px;
          border-radius: 8px;
          object-fit: cover;
          background: #efe4d5;
          display: grid;
          place-items: center;
        }

        .admin-account-pet small {
          display: block;
          margin: 3px 0 6px;
          color: rgba(31, 26, 23, 0.58);
        }

        .admin-account-lists {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .admin-account-lists section {
          border: 1px solid rgba(92, 76, 58, 0.12);
          border-radius: 8px;
          padding: 12px;
          background: #ffffff;
        }

        .admin-account-lists h3 {
          margin: 0 0 10px;
          font-size: 15px;
        }

        .admin-account-lists p + p {
          margin-top: 10px;
        }

        .admin-account-conversation {
          border: 1px solid rgba(92, 76, 58, 0.14);
          border-radius: 8px;
          padding: 14px;
          background: #ffffff;
        }

        .admin-account-conversation + .admin-account-conversation {
          margin-top: 12px;
        }

        .admin-account-messages {
          display: grid;
          gap: 8px;
          margin-top: 12px;
        }

        .admin-account-message {
          border-radius: 8px;
          padding: 10px 12px;
          background: #f6f3ee;
        }

        .admin-account-message.is-specialist {
          background: #ecf5ef;
        }

        .admin-account-message small {
          display: block;
          margin-bottom: 5px;
          color: rgba(31, 26, 23, 0.58);
        }

        .admin-account-message a {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 7px;
          color: #2f7667;
          font-weight: 700;
        }

        .admin-account-reply {
          display: grid;
          gap: 9px;
          margin-top: 12px;
        }

        .admin-account-reply textarea {
          width: 100%;
          resize: vertical;
          border: 1px solid rgba(92, 76, 58, 0.18);
          border-radius: 8px;
          padding: 10px 12px;
          font: inherit;
        }

        .admin-account-reply label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(31, 26, 23, 0.68);
          font-size: 13px;
        }

        @media (max-width: 720px) {
          .admin-account-room-head,
          .admin-account-conversation-head {
            display: grid;
          }

          .admin-account-stats {
            justify-content: flex-start;
          }

          .admin-account-lists {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
