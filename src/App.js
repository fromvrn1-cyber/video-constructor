import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Play, Pause, Settings, Users, Monitor, ChevronUp, ChevronDown, Save } from 'lucide-react';
import { uploadFile, getFileUrl } from './api';

const VideoConstructor = () => {
  const [currentPage, setCurrentPage] = useState('menu');
  const [resolution, setResolution] = useState({ width: 1920, height: 1080 });

  const renderCanvas = (layers, canvas, videoElementsMap) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sortedLayers = [...layers].sort((a, b) => {
      if (a.type === 'background') return -1;
      if (b.type === 'background') return 1;
      return 0;
    });
    sortedLayers.forEach(layer => {
      if (!layer.visible || !layer.fileUrl) return;
      ctx.globalAlpha = layer.opacity;
      ctx.save();
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const isVideo = layer.fileName && (
        layer.fileName.toLowerCase().endsWith('.mp4') ||
        layer.fileName.toLowerCase().endsWith('.webm') ||
        layer.fileName.toLowerCase().endsWith('.mov')
      );
      if (isVideo && videoElementsMap[layer.id]) {
        const video = videoElementsMap[layer.id];
        if (video.readyState >= 2) {
          const scale = layer.scale;
          const width = canvas.width * scale;
          const height = canvas.height * scale;
          const x = centerX - width / 2 + layer.position.x;
          const y = centerY - height / 2 + layer.position.y;
          ctx.drawImage(video, x, y, width, height);
        }
      } else {
        const img = new window.Image();
        img.src = getFileUrl(layer.fileUrl);
        if (img.complete) {
          const scale = layer.scale;
          const width = canvas.width * scale;
          const height = canvas.height * scale;
          const x = centerX - width / 2 + layer.position.x;
          const y = centerY - height / 2 + layer.position.y;
          ctx.drawImage(img, x, y, width, height);
        } else {
          img.onload = () => {
            const scale = layer.scale;
            const width = canvas.width * scale;
            const height = canvas.height * scale;
            const x = centerX - width / 2 + layer.position.x;
            const y = centerY - height / 2 + layer.position.y;
            ctx.drawImage(img, x, y, width, height);
          };
        }
      }
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  };

  const MenuPage = () => (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-12">Конструктор видео</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button onClick={() => setCurrentPage('admin')} className="flex flex-col items-center gap-4 p-8 bg-blue-600 hover:bg-blue-700 rounded-xl transition">
            <Settings size={64} className="text-white" />
            <span className="text-2xl font-semibold text-white">Админка</span>
            <span className="text-sm text-blue-100">Настройка контента</span>
          </button>
          <button onClick={() => setCurrentPage('user')} className="flex flex-col items-center gap-4 p-8 bg-green-600 hover:bg-green-700 rounded-xl transition">
            <Users size={64} className="text-white" />
            <span className="text-2xl font-semibold text-white">Для пользователей</span>
            <span className="text-sm text-green-100">Выбор элементов</span>
          </button>
          <button onClick={() => setCurrentPage('display')} className="flex flex-col items-center gap-4 p-8 bg-purple-600 hover:bg-purple-700 rounded-xl transition">
            <Monitor size={64} className="text-white" />
            <span className="text-2xl font-semibold text-white">Экран</span>
            <span className="text-sm text-purple-100">Лайфвью</span>
          </button>
        </div>
      </div>
    </div>
  );
const AdminPage = () => {
    const [layers, setLayers] = useState([]);
    const [templateName, setTemplateName] = useState('');
    const [localVideoElements, setLocalVideoElements] = useState({});
    const [localIsPlaying, setLocalIsPlaying] = useState(false);
    const adminCanvasRef = useRef(null);
    const animationIdRef = useRef(null);

    useEffect(() => {
      if (localIsPlaying) {
        const animate = () => {
          renderCanvas(layers, adminCanvasRef.current, localVideoElements);
          animationIdRef.current = requestAnimationFrame(animate);
        };
        animate();
      } else {
        renderCanvas(layers, adminCanvasRef.current, localVideoElements);
      }
      return () => {
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
        }
      };
    }, [layers, localVideoElements, localIsPlaying]);

    const addLayer = (type) => {
      const newLayer = {
        id: Date.now(),
        type: type,
        file: null,
        fileUrl: null,
        fileName: '',
        name: `${type} ${layers.length + 1}`,
        opacity: 1,
        scale: 1,
        position: { x: 0, y: 0 },
        visible: true,
        userSelectable: type !== 'background'
      };
      setLayers([...layers, newLayer]);
    };

    const handleFileUpload = async (layerId, event) => {
      const file = event.target.files[0];
      if (!file) return;
      try {
        const result = await uploadFile(file);
        if (result.success) {
          const isVideo = file.type.startsWith('video/');
          if (isVideo) {
            const video = document.createElement('video');
            video.src = getFileUrl(result.path);
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            video.onloadeddata = () => {
              setLocalVideoElements(prev => ({
                ...prev,
                [layerId]: video
              }));
            };
          }
          setLayers(layers.map(layer => 
            layer.id === layerId 
              ? { ...layer, file, fileUrl: result.path, fileName: result.filename }
              : layer
          ));
        } else {
          alert('Ошибка загрузки файла: ' + result.error);
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert('Ошибка загрузки файла');
      }
    };

    const deleteLayer = (layerId) => {
      if (localVideoElements[layerId]) {
        const video = localVideoElements[layerId];
        video.pause();
        video.src = '';
        const newVideoElements = { ...localVideoElements };
        delete newVideoElements[layerId];
        setLocalVideoElements(newVideoElements);
      }
      setLayers(layers.filter(layer => layer.id !== layerId));
    };

    const updateLayer = (layerId, updates) => {
      setLayers(layers.map(layer =>
        layer.id === layerId ? { ...layer, ...updates } : layer
      ));
    };

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

    const saveCurrentTemplate = () => {
      const template = {
        id: Date.now(),
        name: templateName || 'Новый шаблон',
        layers,
        resolution
      };
      localStorage.setItem('video-template', JSON.stringify(template));
      alert('Шаблон сохранён локально!');
    };

    const togglePlayback = () => {
      if (localIsPlaying) {
        Object.values(localVideoElements).forEach(video => {
          if (video) video.pause();
        });
        setLocalIsPlaying(false);
      } else {
        Object.values(localVideoElements).forEach(video => {
          if (video) video.play();
        });
        setLocalIsPlaying(true);
      }
    };
return (
      <div className="flex h-screen bg-gray-900 text-white">
        <div className="w-96 bg-gray-800 border-r border-gray-700 overflow-y-auto">
          <div className="p-4 border-b border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-xl font-bold">Админка</h1>
              <button
                onClick={() => setCurrentPage('menu')}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Назад
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm mb-2">Разрешение видео</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={resolution.width}
                  onChange={(e) => setResolution({ ...resolution, width: Number(e.target.value) })}
                  className="px-3 py-2 bg-gray-700 rounded"
                  placeholder="Ширина"
                />
                <input
                  type="number"
                  value={resolution.height}
                  onChange={(e) => setResolution({ ...resolution, height: Number(e.target.value) })}
                  className="px-3 py-2 bg-gray-700 rounded"
                  placeholder="Высота"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setResolution({ width: 1920, height: 1080 })}
                  className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                >
                  1920x1080
                </button>
                <button
                  onClick={() => setResolution({ width: 1280, height: 720 })}
                  className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                >
                  1280x720
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm mb-2">Название шаблона</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded"
                placeholder="Мой шаблон"
              />
            </div>

            <div className="space-y-2">
              <button
                onClick={() => addLayer('background')}
                className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                <Plus size={18} />
                Фон (видео/картинка)
              </button>
              <button
                onClick={() => addLayer('overlay')}
                className="w-full flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
              >
                <Plus size={18} />
                Наложение (видео)
              </button>
              <button
                onClick={() => addLayer('image')}
                className="w-full flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
              >
                <Plus size={18} />
                Картинка
              </button>
            </div>

            <button
              onClick={saveCurrentTemplate}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded mt-4"
            >
              <Save size={18} />
              Сохранить шаблон
            </button>
          </div>

          <div className="p-4 space-y-3">
            <h2 className="text-lg font-semibold">Слои ({layers.length})</h2>
            
            {layers.length === 0 && (
              <p className="text-gray-400 text-sm">Добавьте слои</p>
            )}

            {layers.map((layer, index) => (
              <div key={layer.id} className="bg-gray-700 rounded p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={layer.name}
                    onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
                    className="flex-1 px-2 py-1 bg-gray-600 rounded text-sm mr-2"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveLayer(layer.id, 'up')}
                      className="p-1 hover:bg-gray-600 rounded"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      onClick={() => moveLayer(layer.id, 'down')}
                      className="p-1 hover:bg-gray-600 rounded"
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
                  className="w-full text-xs"
                />

                {layer.fileName && (
                  <div className="text-xs text-green-400">📎 {layer.fileName}</div>
                )}

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={layer.userSelectable}
                    onChange={(e) => updateLayer(layer.id, { userSelectable: e.target.checked })}
                  />
                  Выбирается пользователем
                </label>

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
                        max="3"
                        step="0.1"
                        value={layer.scale}
                        onChange={(e) => updateLayer(layer.id, { scale: Number(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs mb-1">X</label>
                        <input
                          type="number"
                          value={layer.position.x}
                          onChange={(e) => updateLayer(layer.id, { 
                            position: { ...layer.position, x: Number(e.target.value) }
                          })}
                          className="w-full px-2 py-1 bg-gray-600 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">Y</label>
                        <input
                          type="number"
                          value={layer.position.y}
                          onChange={(e) => updateLayer(layer.id, { 
                            position: { ...layer.position, y: Number(e.target.value) }
                          })}
                          className="w-full px-2 py-1 bg-gray-600 rounded text-xs"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center bg-black p-4">
          <div className="text-center w-full flex-1 flex items-center justify-center">
            <canvas
              ref={adminCanvasRef}
              width={resolution.width}
              height={resolution.height}
              className="max-w-full max-h-full border-2 border-gray-600"
              style={{ 
                width: 'auto',
                height: 'auto',
                maxWidth: '100%',
                maxHeight: 'calc(100vh - 150px)'
              }}
            />
          </div>
          
          <div className="w-full max-w-2xl p-4 bg-gray-800 rounded">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={togglePlayback}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded"
              >
                {localIsPlaying ? <Pause size={20} /> : <Play size={20} />}
                {localIsPlaying ? 'Пауза' : 'Воспроизвести'}
              </button>
              
              <div className="text-gray-400 text-sm">
                Разрешение: {resolution.width}x{resolution.height}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
const UserPage = () => {
    const [userLayers, setUserLayers] = useState([]);
    const [availableOptions, setAvailableOptions] = useState([]);
    const userCanvasRef = useRef(null);
    const [userVideoElements, setUserVideoElements] = useState({});
    const [userIsPlaying, setUserIsPlaying] = useState(false);
    const userAnimationRef = useRef(null);
    const [draggingLayer, setDraggingLayer] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
      const saved = localStorage.getItem('video-template');
      if (saved) {
        const template = JSON.parse(saved);
        const selectableItems = template.layers.filter(l => l.userSelectable);
        setAvailableOptions(selectableItems);
      }
    }, []);

    useEffect(() => {
      if (userIsPlaying) {
        const animate = () => {
          renderCanvas(userLayers, userCanvasRef.current, userVideoElements);
          userAnimationRef.current = requestAnimationFrame(animate);
        };
        animate();
      } else {
        renderCanvas(userLayers, userCanvasRef.current, userVideoElements);
      }
      return () => {
        if (userAnimationRef.current) {
          cancelAnimationFrame(userAnimationRef.current);
        }
      };
    }, [userLayers, userVideoElements, userIsPlaying]);

    const selectOption = (option) => {
      const existingIndex = userLayers.findIndex(l => l.type === option.type);
      const newLayer = { ...option, id: Date.now() };
      const isVideo = option.fileName && (
        option.fileName.toLowerCase().endsWith('.mp4') ||
        option.fileName.toLowerCase().endsWith('.webm') ||
        option.fileName.toLowerCase().endsWith('.mov')
      );
      if (isVideo) {
        const video = document.createElement('video');
        video.src = getFileUrl(option.fileUrl);
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.onloadeddata = () => {
          setUserVideoElements(prev => ({
            ...prev,
            [newLayer.id]: video
          }));
        };
      }
      if (existingIndex >= 0) {
        const newLayers = [...userLayers];
        newLayers[existingIndex] = newLayer;
        setUserLayers(newLayers);
      } else {
        setUserLayers([...userLayers, newLayer]);
      }
    };

    const updateUserLayer = (layerId, updates) => {
      setUserLayers(userLayers.map(layer =>
        layer.id === layerId ? { ...layer, ...updates } : layer
      ));
    };

    const removeUserLayer = (layerId) => {
      setUserLayers(userLayers.filter(l => l.id !== layerId));
      if (userVideoElements[layerId]) {
        const video = userVideoElements[layerId];
        video.pause();
        video.src = '';
        const newVideoElements = { ...userVideoElements };
        delete newVideoElements[layerId];
        setUserVideoElements(newVideoElements);
      }
    };

    const toggleUserPlayback = () => {
      if (userIsPlaying) {
        Object.values(userVideoElements).forEach(video => {
          if (video) video.pause();
        });
        setUserIsPlaying(false);
      } else {
        Object.values(userVideoElements).forEach(video => {
          if (video) video.play();
        });
        setUserIsPlaying(true);
      }
    };

    const handleCanvasMouseDown = (e) => {
      const canvas = userCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      for (let i = userLayers.length - 1; i >= 0; i--) {
        const layer = userLayers[i];
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const width = canvas.width * layer.scale;
        const height = canvas.height * layer.scale;
        const layerX = centerX - width / 2 + layer.position.x;
        const layerY = centerY - height / 2 + layer.position.y;
        if (x >= layerX && x <= layerX + width && y >= layerY && y <= layerY + height) {
          setDraggingLayer(layer.id);
          setDragOffset({ x: x - layer.position.x, y: y - layer.position.y });
          break;
        }
      }
    };

    const handleCanvasMouseMove = (e) => {
      if (!draggingLayer) return;
      const canvas = userCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      updateUserLayer(draggingLayer, {
        position: {
          x: x - dragOffset.x,
          y: y - dragOffset.y
        }
      });
    };

    const handleCanvasMouseUp = () => {
      setDraggingLayer(null);
    };

    const handleCanvasTouchStart = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleCanvasMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
    };

    const handleCanvasTouchMove = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleCanvasMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    };

    const handleCanvasTouchEnd = () => {
      handleCanvasMouseUp();
    };
return (
      <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
        <div className="w-80 bg-gray-800 border-r border-gray-700 overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-xl font-bold">Создайте видео</h1>
              <button
                onClick={() => setCurrentPage('menu')}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Назад
              </button>
            </div>
            <p className="text-sm text-gray-400">Выберите элементы</p>
          </div>

          <div className="p-4 space-y-4">
            {availableOptions.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <p>Нет доступных элементов</p>
                <p className="text-xs mt-2">Создайте шаблон в админке</p>
              </div>
            ) : (
              availableOptions.map(option => {
                const isSelected = userLayers.some(l => l.name === option.name);
                const selectedLayer = userLayers.find(l => l.name === option.name);
                return (
                  <div key={option.id} className="bg-gray-700 rounded overflow-hidden">
                    <div
                      className="cursor-pointer hover:bg-gray-600 transition p-3"
                      onClick={() => selectOption(option)}
                    >
                      <div className="aspect-video bg-gray-800 rounded mb-2 flex items-center justify-center overflow-hidden">
                        {option.fileUrl ? (
                          option.fileName && /\.(mp4|webm|mov)$/i.test(option.fileName) ? (
                            <video
                              src={getFileUrl(option.fileUrl)}
                              className="w-full h-full object-cover"
                              muted
                              loop
                              playsInline
                            />
                          ) : (
                            <img
                              src={getFileUrl(option.fileUrl)}
                              alt={option.name}
                              className="w-full h-full object-cover"
                            />
                          )
                        ) : (
                          <span className="text-gray-500 text-sm">Нет превью</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{option.name}</div>
                          <div className="text-xs text-gray-400">{option.type}</div>
                        </div>
                        {isSelected && (
                          <span className="text-xs bg-green-600 px-2 py-1 rounded">Выбрано</span>
                        )}
                      </div>
                    </div>

                    {isSelected && selectedLayer && (
                      <div className="p-3 bg-gray-800 space-y-3 border-t border-gray-700">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <label>Прозрачность</label>
                            <span>{Math.round(selectedLayer.opacity * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={selectedLayer.opacity}
                            onChange={(e) => updateUserLayer(selectedLayer.id, { opacity: Number(e.target.value) })}
                            className="w-full h-8"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <label>Масштаб</label>
                            <span>{Math.round(selectedLayer.scale * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="2"
                            step="0.1"
                            value={selectedLayer.scale}
                            onChange={(e) => updateUserLayer(selectedLayer.id, { scale: Number(e.target.value) })}
                            className="w-full h-8"
                          />
                        </div>

                        <button
                          onClick={() => removeUserLayer(selectedLayer.id)}
                          className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
                        >
                          Удалить
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex items-center justify-center bg-black p-4">
            <div className="relative">
              <canvas
                ref={userCanvasRef}
                width={resolution.width}
                height={resolution.height}
                className="max-w-full max-h-full border-2 border-gray-600 cursor-move"
                style={{ 
                  width: 'auto',
                  height: 'auto',
                  maxWidth: '100%',
                  maxHeight: 'calc(100vh - 150px)',
                  touchAction: 'none'
                }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onTouchStart={handleCanvasTouchStart}
                onTouchMove={handleCanvasTouchMove}
                onTouchEnd={handleCanvasTouchEnd}
              />
              <div className="absolute top-2 left-2 bg-blue-600 bg-opacity-90 text-white px-3 py-1 rounded text-sm">
                💡 Перетаскивайте элементы
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-800 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <button
                onClick={toggleUserPlayback}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded text-lg"
              >
                {userIsPlaying ? <Pause size={24} /> : <Play size={24} />}
                {userIsPlaying ? 'Пауза' : 'Воспроизвести'}
              </button>

              <button
                onClick={() => setCurrentPage('display')}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded text-lg"
              >
                <Monitor size={24} />
                Вывести на экран
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DisplayPage = () => {
    const displayCanvasRef = useRef(null);
    const [displayVideoElements, setDisplayVideoElements] = useState({});
    const [displayIsPlaying, setDisplayIsPlaying] = useState(true);
    const displayAnimationRef = useRef(null);
    const [displayLayers, setDisplayLayers] = useState([]);

    useEffect(() => {
      const saved = localStorage.getItem('video-template');
      if (saved) {
        const template = JSON.parse(saved);
        setDisplayLayers(template.layers);
        template.layers.forEach(layer => {
          if (layer.fileUrl && layer.fileName) {
            const isVideo = /\.(mp4|webm|mov)$/i.test(layer.fileName);
            if (isVideo) {
              const video = document.createElement('video');
              video.src = getFileUrl(layer.fileUrl);
              video.loop = true;
              video.muted = true;
              video.playsInline = true;
              video.autoplay = true;
              video.onloadeddata = () => {
                video.play();
                setDisplayVideoElements(prev => ({
                  ...prev,
                  [layer.id]: video
                }));
              };
            }
          }
        });
      }
    }, []);

    useEffect(() => {
      if (displayIsPlaying) {
        const animate = () => {
          renderCanvas(displayLayers, displayCanvasRef.current, displayVideoElements);
          displayAnimationRef.current = requestAnimationFrame(animate);
        };
        animate();
      } else {
        renderCanvas(displayLayers, displayCanvasRef.current, displayVideoElements);
      }
      return () => {
        if (displayAnimationRef.current) {
          cancelAnimationFrame(displayAnimationRef.current);
        }
      };
    }, [displayLayers, displayVideoElements, displayIsPlaying]);

    const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    };

    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center relative">
        <div className="flex-1 flex items-center justify-center w-full">
          <canvas
            ref={displayCanvasRef}
            width={resolution.width}
            height={resolution.height}
            className="max-w-full max-h-full"
            style={{ 
              width: 'auto',
              height: 'auto',
              maxWidth: '100%',
              maxHeight: '100%'
            }}
          />
        </div>

        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 bg-opacity-90 rounded-lg p-3 flex gap-3">
          <button
            onClick={() => setDisplayIsPlaying(!displayIsPlaying)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-2"
          >
            {displayIsPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded flex items-center gap-2"
          >
            <Monitor size={18} />
            Полный экран
          </button>

          <button
            onClick={() => setCurrentPage('menu')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            Закрыть
          </button>
        </div>
      </div>
    );
  };
return (
    <>
      {currentPage === 'menu' && <MenuPage />}
      {currentPage === 'admin' && <AdminPage />}
      {currentPage === 'user' && <UserPage />}
      {currentPage === 'display' && <DisplayPage />}
    </>
  );
};

export default VideoConstructor;