import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { productionAPI } from '../api/production';
import './Production.css';

const Production = () => {
  const stageElements = useRef({});
  const navigate = useNavigate();
  const [productionItems, setProductionItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState(null);

  const stages = [
    { key: 'MATERIAL', label: 'Material', color: '#94A3B8' },
    { key: 'CUTTING', label: 'Cutting', color: '#60A5FA' },
    { key: 'STITCHING', label: 'Stitching', color: '#A78BFA' },
    { key: 'FINISHING', label: 'Finishing', color: '#F59E0B' },
    { key: 'QC', label: 'QC', color: '#10B981' },
    { key: 'PACKING', label: 'Packing', color: '#8B5CF6' },
    { key: 'DISPATCH', label: 'Dispatch', color: '#4A7C59' },
  ];

  useEffect(() => {
    fetchProductionBoard();
  }, []);

  const fetchProductionBoard = async () => {
    try {
      setLoading(true);
      const data = await productionAPI.getProductionBoard();
      setProductionItems(data.productionItems);
      setSummary(data.summary);
    } catch (error) {
      console.error('Failed to fetch production board:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();

    if (!draggedItem || draggedItem.stage === targetStage) {
      setDraggedItem(null);
      return;
    }

    try {
      await productionAPI.updateProductionStage(draggedItem.id, { stage: targetStage });
      await fetchProductionBoard();
    } catch (error) {
      console.error('Failed to update stage:', error);
      alert('Failed to update production stage');
    }

    setDraggedItem(null);
  };

  const getItemsForStage = (stage) => {
    return productionItems.filter((item) => item.stage === stage);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  if (loading) {
    return (
      <div className="production-page">
        <div className="loading-container">
          <div className="loading-spinner">Loading production board...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="production-page">
      {/* Top Bar */}
      <div className="topbar">
        <div>
          <h1>Production Board</h1>
          <div className="sub">{productionItems.length} items in production</div>
        </div>
        <div className="topbar-actions">
          <button className="btn" onClick={() => navigate('/orders')}>View Orders</button>
          <button className="btn btn-primary" onClick={fetchProductionBoard}>Refresh</button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="summary-bar">
        {stages.map((stage) => (
          <button type="button" key={stage.key} className="summary-item" title={`Show ${stage.label}`} onClick={() => stageElements.current[stage.key]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" })}>
            <div className="summary-count" style={{ color: stage.color }}>
              {summary[stage.key.toLowerCase()] || 0}
            </div>
            <div className="summary-label">{stage.label}</div>
          </button>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="kanban-board">
        {stages.map((stage) => (
          <div
            key={stage.key}
            ref={node => { stageElements.current[stage.key] = node; }}
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.key)}
          >
            <div className="column-header" style={{ borderTopColor: stage.color }}>
              <div className="column-title">{stage.label}</div>
              <div className="column-count">{getItemsForStage(stage.key).length}</div>
            </div>

            <div className="column-body">
              {getItemsForStage(stage.key).length === 0 ? (
                <div className="empty-column">No items</div>
              ) : (
                getItemsForStage(stage.key).map((item) => (
                  <div
                    key={item.id}
                    className="production-card"
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                  >
                    <div className="card-header">
                      <div className="order-ref">
                        {item.orderItem?.order?.orderNumber}
                      </div>
                      {item.assignedWorker && (
                        <div className="worker-badge">
                          {item.assignedWorker.name.split(' ')[0]}
                        </div>
                      )}
                    </div>

                    <div className="card-body">
                      <div className="product-name">
                        {item.orderItem?.product?.name}
                      </div>
                      <div className="product-meta">
                        <span>Qty: {item.orderItem?.quantity}</span>
                        {item.orderItem?.customization && (
                          <span className="custom-tag">Custom</span>
                        )}
                      </div>
                    </div>

                    <div className="card-footer">
                      <div className="customer-name">
                        {item.orderItem?.order?.customer?.companyName}
                      </div>
                      {item.estimatedCompletion && (
                        <div className="due-date">
                          Due: {formatDate(item.estimatedCompletion)}
                        </div>
                      )}
                    </div>

                    {item.notes && (
                      <div className="card-notes">{item.notes}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Production;
