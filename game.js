// WebAudio Mute Logic on Miss
onNoteMiss() {
  this.streak = 0;
    this.multiplier = 1;
      this.updateUI();
        
          // Cut lead guitar volume momentarily when missing notes
            if (this.guitarGain) {
                this.guitarGain.gain.setValueAtTime(0.05, this.audioCtx.currentTime); // Mute guitar stem
                    this.guitarGain.gain.exponentialRampToValueAtTime(1.0, this.audioCtx.currentTime + 0.8); // Ramp back
                      }
                      }

                      // Explosive Flame Particles
                      spawnFlameParticles(lane) {
                        const w = this.canvas.width;
                          const h = this.canvas.height;
                            const botW = w * 0.75;
                              const botY = h * 0.82;
                                const laneW = botW / 4;
                                  const hitX = (w - botW) / 2 + laneW * lane + laneW / 2;

                                    for (let i = 0; i < 20; i++) {
                                        this.particles.push({
                                              x: hitX,
                                                    y: botY,
                                                          vx: (Math.random() - 0.5) * 12,
                                                                vy: (Math.random() - 1) * 14,
                                                                      color: Math.random() > 0.4 ? '#ff3300' : '#ffcc00', // Flame Red/Gold
                                                                            size: 6 + Math.random() * 8,
                                                                                  life: 1.0
                                                                                      });
                                                                                        }
                                                                                        }⁷