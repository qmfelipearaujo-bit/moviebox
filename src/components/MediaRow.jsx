import MediaCard from './MediaCard'

export default function MediaRow({ title, items = [], onOpen }) {
  if (!items.length) return null
  return (
    <section className="row-section">
      <div className="section-title"><h2>{title}</h2></div>
      <div className="media-row">
        {items.map((item) => <MediaCard key={`${item.media_type || 'auto'}-${item.id}`} item={item} onOpen={onOpen} />)}
      </div>
    </section>
  )
}
