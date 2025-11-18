import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Play, Pause, Download, Image, Video, ChevronUp, ChevronDown } from 'lucide-react';

const VideoConstructor = () => {
  const [layers, setLayers] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(10);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);

  // Добавить новый слой
  const addLayer = (type) => {
    const newLayer = {
      id: Date.now(),
      type: type, // 'background', 'image', 'video', 'logo'
      file: null,
      fileUrl: null,
      name: `${type === 'background' ? 'Фон' : type === 'image' ? 'Картинка' : type === 'video' ? 'Видео' : 'Логотип'} ${layers.length + 1}`,
      startTime: 0,
      duration: type === 'video' ? 5 : duration,
      opacity: 1,
      scale: 1,
      position: { x: 0, y: 0 },
      visible: true
    };
    setLayers([...layers, newLayer]);
  };

  // Загрузить файл
  const handleFileUpload = (layerId, event) => {
    const file = event.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setLayers(layers.map(layer => 
      layer.id === layerId 
        ? { ...layer, file, fileUrl: url }
        : layer
    ));
  };

  // Удалить слой
  const deleteLayer = (layerId) => {
    setLayers(layers.filter(layer => layer.id !== layerId));
  };

  // Переместить слой
  const moveLayer = (layerId, direction) => {
    const index = layers.findIndex(l => l.id === layerId);
    if (direction === 'up' && index > 0) {
      const newLayers = [...layers];
      [newLayers[index], newLayers[index - 1]] = [newLayers[index - 1], newLayers[index]];
      setLayers(newLayers);
    } else if (direction === 'down' && index < layers.length - 1) {
      const newLayers = [...layers];
      [newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]];
      setLayers(newLayers);
    }
  };

  // Обновить параметры слоя
  const updateLayer = (layerId, updates) => {
    setLayers(layers.map(layer =>
      layer.id === layerId ? { ...layer, ...updates } : layer
    ));
  };

  // Рендеринг на canvas
  const renderFrame = (time) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Сортируем слои (фон внизу, остальное сверху)
    const sortedLayers = [...layers].sort((a, b) => {
      if (a.type === 'background') return -1;
      if (b.type === 'background') return 1;
      return 0;
    });

    sortedLayers.forEach(layer => {
      if (!layer.visible || !layer.fileUrl) return;
      if (time < layer.startTime || time > layer.startTime + layer.duration) return;

      ctx.globalAlpha = layer.opacity;

      if (layer.type === 'image' || layer.type === 'background' || layer.type === 'logo') {
        const img = new window.Image();
        img.src = layer.fileUrl;
        
        if (img.complete) {
          const scale = layer.scale;
          const width = canvas.width * scale;
          const height = canvas.height * scale;
          const x = (canvas.width - width) / 2 + layer.position.x;
          const y = (canvas.height - height) / 2 + layer.position.y;
          
          ctx.drawImage(img, x, y, width, height);
        }
      }
    });

    ctx.globalAlpha = 1;
  };

  // Анимация воспроизведения
  const animate = (timestamp) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const elapsed = (timestamp - startTimeRef.current) / 1000;
    
    if (elapsed <= duration) {
      setCurrentTime(elapsed);
      renderFrame(elapsed);
      animationRef.current = requestAnimationFrame(animate);
    } else {
      setIsPlaying(false);
      setCurrentTime(0);
      startTimeRef.current = null;
    }
  };

  // Управление воспроизведением
  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      startTimeRef.current = null;
    } else {
      setIsPlaying(true);
      startTimeRef.current = null;
      animationRef.current = requestAnimationFrame(animate);
    }
  };

  // Перерисовка при изменении слоев
  useEffect(() => {
    if (!isPlaying) {
      renderFrame(currentTime);
    }
  }, [layers, currentTime]);

  // Экспорт видео (упрощенная версия - скриншот)
  const exportVideo = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = 'video-preview.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Админка (левая панель) */}
      <div className="w-96 bg-gray-800 border-r border-gray-700 overflow-y-auto">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold mb-4">Конструктор видео</h1>
          
          {/* Кнопки добавления слоев */}
          <div className="space-y-2">
            <button
              onClick={() => addLayer('background')}
              className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              <Image size={18} />
              Добавить фон
            </button>
            <button
              onClick={() => addLayer('image')}
              className="w-full flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
            >
              <Image size={18} />
              Добавить картинку
            </button>
            <button
              onClick={() => addLayer('logo')}
              className="w-full flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
            >
              <Image size={18} />
              Добавить логотип
            </button>
          </div>

          {/* Длительность видео */}
          <div className="mt-4">
            <label className="block text-sm mb-2">Длительность видео (сек)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-700 rounded"
              min="1"
              max="60"
            />
          </div>
        </div>

        {/* Список слоев */}
        <div className="p-4 space-y-3">
          <h2 className="text-lg font-semibold mb-3">Слои ({layers.length})</h2>
          
          {layers.length === 0 && (
            <p className="text-gray-400 text-sm">Добавьте слои, чтобы начать</p>
          )}

          {layers.map((layer, index) => (
            <div key={layer.id} className="bg-gray-700 rounded p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{layer.name}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => moveLayer(layer.id, 'up')}
                    className="p-1 hover:bg-gray-600 rounded"
                    disabled={index === 0}
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    onClick={() => moveLayer(layer.id, 'down')}
                    className="p-1 hover:bg-gray-600 rounded"
                    disabled={index === layers.length - 1}
                  >
                    <ChevronDown size={16} />
                  </button>
                  <button
                    onClick={() => deleteLayer(layer.id)}
                    className="p-1 hover:bg-red-600 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => handleFileUpload(layer.id, e)}
                className="w-full text-sm"
              />

              {layer.fileUrl && (
                <>
                  <div>
                    <label className="block text-xs mb-1">Прозрачность</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={layer.opacity}
                      onChange={(e) => updateLayer(layer.id, { opacity: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs mb-1">Масштаб</label>
                    <input
                      type="range"
                      min="0.1"
                      max="2"
                      step="0.1"
                      value={layer.scale}
                      onChange={(e) => updateLayer(layer.id, { scale: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs mb-1">X позиция</label>
                      <input
                        type="number"
                        value={layer.position.x}
                        onChange={(e) => updateLayer(layer.id, { 
                          position: { ...layer.position, x: Number(e.target.value) }
                        })}
                        className="w-full px-2 py-1 bg-gray-600 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Y позиция</label>
                      <input
                        type="number"
                        value={layer.position.y}
                        onChange={(e) => updateLayer(layer.id, { 
                          position: { ...layer.position, y: Number(e.target.value) }
                        })}
                        className="w-full px-2 py-1 bg-gray-600 rounded text-sm"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={layer.visible}
                      onChange={(e) => updateLayer(layer.id, { visible: e.target.checked })}
                    />
                    <span className="text-sm">Видимый</span>
                  </label>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Превью (правая панель) */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center bg-black">
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            className="max-w-full max-h-full border-2 border-gray-600"
          />
        </div>

        {/* Панель управления */}
        <div className="bg-gray-800 p-4 border-t border-gray-700">
          <div className="flex items-center gap-4 mb-3">
            <button
              onClick={togglePlay}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              {isPlaying ? 'Пауза' : 'Воспроизвести'}
            </button>

            <button
              onClick={exportVideo}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 rounded"
            >
              <Download size={20} />
              Экспорт (скриншот)
            </button>

            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span>{currentTime.toFixed(1)}s</span>
                <span>{duration}s</span>
              </div>
              <input
                type="range"
                min="0"
                max={duration}
                step="0.1"
                value={currentTime}
                onChange={(e) => {
                  const time = Number(e.target.value);
                  setCurrentTime(time);
                  renderFrame(time);
                }}
                className="w-full"
              />
            </div>
          </div>

          <div className="text-xs text-gray-400">
            💡 Совет: Фоновые слои отображаются внизу, картинки и логотипы - сверху. Используйте стрелки для изменения порядка.
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoConstructor;