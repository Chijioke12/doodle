import Phaser from 'phaser';
import './index.css';

class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    // Load the generated atlas using URLs so the build doesn't crash while files are missing
    this.load.atlas('doodlejump', '/doodlejump.png?v=4', '/doodlejump.json?v=4');
    
    // Load sounds
    this.load.audio('jump', '/doodlejump_sounds/jump.wav');
    this.load.audio('fall', '/doodlejump_sounds/fall_warning.wav');
    this.load.audio('game_over', '/doodlejump_sounds/game_over.wav');
    this.load.audio('music', '/doodlejump_sounds/music_sky_bounce.wav');
    this.load.audio('ui_click', '/doodlejump_sounds/ui_click.wav');
  }

  create() {
    this.scene.start('MenuScene');
  }
}

class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.add.tileSprite(0, 0, 240, 320, 'doodlejump', 'bg_tile').setOrigin(0, 0);
    
    const title = this.add.text(120, 100, 'DOODLE JUMP', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const prompt = this.add.text(120, 200, 'Press ENTER\nto Start', {
      fontSize: '16px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    this.input.keyboard!.on('keydown-ENTER', () => {
      this.sound.play('ui_click');
      this.scene.start('GameScene');
    });
  }
}

class GameScene extends Phaser.Scene {
  player!: Phaser.Physics.Arcade.Sprite;
  platforms!: Phaser.Physics.Arcade.Group;
  springs!: Phaser.Physics.Arcade.Group;
  monsters!: Phaser.Physics.Arcade.Group;
  bullets!: Phaser.Physics.Arcade.Group;
  coins!: Phaser.Physics.Arcade.Group;
  powerups!: Phaser.Physics.Arcade.Group;
  
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  spaceKey!: Phaser.Input.Keyboard.Key;
  
  score: number = 0;
  scoreText!: Phaser.GameObjects.Text;
  highestY: number = 0;
  bg!: Phaser.GameObjects.TileSprite;
  
  isGameOver: boolean = false;

  constructor() {
    super('GameScene');
  }

  create() {
    this.score = 0;
    this.highestY = 250;
    this.isGameOver = false;

    this.bg = this.add.tileSprite(0, 0, 240, 320, 'doodlejump', 'bg_tile').setOrigin(0, 0);
    this.bg.setScrollFactor(0);

    this.platforms = this.physics.add.group({ allowGravity: false, immovable: true });
    this.springs = this.physics.add.group({ allowGravity: false, immovable: true });
    this.monsters = this.physics.add.group({ allowGravity: false, immovable: true });
    this.bullets = this.physics.add.group({ allowGravity: false });
    this.coins = this.physics.add.group({ allowGravity: false, immovable: true });
    this.powerups = this.physics.add.group({ allowGravity: false, immovable: true });

    // Create initial platforms
    for (let i = 0; i < 6; i++) {
      this.spawnPlatform(300 - i * 60, i === 0);
    }

    this.player = this.physics.add.sprite(120, 250, 'doodlejump', 'doodler_jump');
    this.player.setScale(0.5);
    this.player.setGravityY(600);
    this.player.setDepth(10);
    this.player.body!.setSize(44, 48);
    this.player.body!.setOffset(10, 16);

    this.physics.add.collider(this.player, this.platforms, this.hitPlatform as any, undefined, this);
    this.physics.add.collider(this.player, this.springs, this.hitSpring as any, undefined, this);
    this.physics.add.overlap(this.player, this.monsters, this.hitMonster as any, undefined, this);
    this.physics.add.overlap(this.bullets, this.monsters, this.killMonster as any, undefined, this);
    this.physics.add.overlap(this.player, this.coins, this.collectCoin as any, undefined, this);
    this.physics.add.overlap(this.player, this.powerups, this.collectPowerup as any, undefined, this);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.scoreText = this.add.text(10, 10, '0', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    this.scoreText.setScrollFactor(0);
    this.scoreText.setDepth(20);

    this.sound.play('music', { loop: true, volume: 0.3 });
    
    this.input.on('pointerdown', this.shoot, this);
  }

  spawnPlatform(y: number, forceNormal: boolean = false) {
    const x = Phaser.Math.Between(40, 200);
    
    let type = 'platform_normal';
    let isMoving = false;
    let isBreakable = false;
    let hasSpring = false;
    
    if (!forceNormal) {
      const r = Math.random();
      if (this.score > 500 && r < 0.2) {
        type = 'platform_moving';
        isMoving = true;
      } else if (this.score > 1000 && r < 0.35) {
        type = 'platform_breakable';
        isBreakable = true;
      } else if (r < 0.45) {
        type = 'platform_spring';
        hasSpring = true;
      }
    }
    
    const p = this.platforms.create(x, y, 'doodlejump', type) as Phaser.Physics.Arcade.Sprite;
    p.setScale(0.5);
    p.body!.checkCollision.down = false;
    p.body!.checkCollision.left = false;
    p.body!.checkCollision.right = false;
    
    p.setData('isMoving', isMoving);
    p.setData('isBreakable', isBreakable);
    
    if (isMoving) {
      p.setVelocityX(Phaser.Math.Between(40, 80) * (Math.random() < 0.5 ? 1 : -1));
    }
    
    if (hasSpring) {
      const spring = this.springs.create(x + 10, y - 9, 'doodlejump', 'spring_normal');
      spring.setScale(0.5);
      spring.body!.checkCollision.down = false;
      spring.body!.checkCollision.left = false;
      spring.body!.checkCollision.right = false;
      spring.setData('platform', p);
    }

    if (!forceNormal && !isBreakable && !isMoving && !hasSpring) {
      if (Math.random() < 0.05) {
        const monsterType = Math.random() < 0.5 ? 'monster_basic' : 'monster_ufo';
        const m = this.monsters.create(x, y - 20, 'doodlejump', monsterType);
        m.setScale(0.5);
        if (monsterType === 'monster_ufo') {
          m.setVelocityX(Phaser.Math.Between(30, 60) * (Math.random() < 0.5 ? 1 : -1));
        }
      } else if (Math.random() < 0.1) {
        const coin = this.coins.create(x, y - 20, 'doodlejump', 'coin');
        coin.setScale(0.5);
      } else if (Math.random() < 0.02) {
        const itemType = Math.random() < 0.5 ? 'jetpack' : 'hat_propeller';
        const item = this.powerups.create(x, y - 20, 'doodlejump', itemType);
        item.setScale(0.5);
        item.setData('type', itemType);
      }
    }
  }

  hitPlatform(player: any, platform: any) {
    if (player.body.touching.down) {
      if (platform.getData('isBreakable')) {
        platform.setFrame('platform_broken');
        platform.body.enable = false;
        this.time.delayedCall(200, () => platform.destroy());
        return;
      }
      
      player.setVelocityY(-400);
      player.setFrame('doodler_jump');
      this.sound.play('jump');
    }
  }

  hitSpring(player: any, spring: any) {
    if (player.body.touching.down) {
      player.setVelocityY(-700);
      player.setFrame('doodler_jump');
      spring.setFrame('spring_compressed');
      this.time.delayedCall(60, () => {
        if (spring.active) spring.setFrame('spring_extended');
      });
      this.time.delayedCall(140, () => {
        if (spring.active) spring.setFrame('spring_normal');
      });
      this.sound.play('jump'); 
    }
  }

  shoot() {
    if (this.isGameOver) return;
    const bullet = this.bullets.create(this.player.x, this.player.y - 20, 'doodlejump', 'bullet');
    bullet.setScale(0.5);
    bullet.setVelocityY(-600);
    this.sound.play('ui_click');
  }

  hitMonster(player: any, monster: any) {
    if (player.body.velocity.y > 0 && player.y < monster.y) {
      monster.destroy();
      player.setVelocityY(-400);
      this.sound.play('jump');
    } else {
      this.triggerGameOver();
    }
  }

  killMonster(bullet: any, monster: any) {
    bullet.destroy();
    monster.destroy();
  }

  collectCoin(player: any, coin: any) {
    coin.destroy();
    this.score += 100;
    this.scoreText.setText(this.score.toString());
  }

  collectPowerup(player: any, powerup: any) {
    const type = powerup.getData('type');
    powerup.destroy();
    if (type === 'jetpack') {
      player.setVelocityY(-1200);
    } else if (type === 'hat_propeller') {
      player.setVelocityY(-800);
    }
  }

  triggerGameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.sound.stopAll();
    this.sound.play('fall');
    this.sound.play('game_over');
    this.player.setVelocityY(-200);
    this.player.setFrame('doodler_fall');
    this.player.body!.checkCollision.none = true;
  }

  update() {
    if (this.isGameOver) {
      if (this.player.y > this.cameras.main.scrollY + 320) {
        this.scene.start('GameOverScene', { score: this.score });
      }
      return;
    }

    // Controls
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-150);
      this.player.setFrame('doodler_left');
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(150);
      this.player.setFrame('doodler_jump');
    } else {
      this.player.setVelocityX(0);
    }

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.shoot();
    }

    // Screen wrap
    if (this.player.x < -20) {
      this.player.x = 260;
    } else if (this.player.x > 260) {
      this.player.x = -20;
    }

    // Update score and camera
    if (this.player.y < this.highestY) {
      const diff = this.highestY - this.player.y;
      this.score += Math.floor(diff);
      this.highestY = this.player.y;
      this.scoreText.setText(this.score.toString());
    }

    if (this.player.y < this.cameras.main.scrollY + 160) {
      this.cameras.main.scrollY = this.player.y - 160;
    }

    this.bg.tilePositionY = this.cameras.main.scrollY * 0.3;

    // Update moving platforms
    this.platforms.getChildren().forEach((child) => {
      const p = child as Phaser.Physics.Arcade.Sprite;
      if (p.getData('isMoving')) {
        if (p.x < 20) p.setVelocityX(Math.abs(p.body!.velocity.x));
        else if (p.x > 220) p.setVelocityX(-Math.abs(p.body!.velocity.x));
      }
    });

    // Update springs attached to moving platforms
    this.springs.getChildren().forEach((child) => {
      const s = child as Phaser.Physics.Arcade.Sprite;
      const p = s.getData('platform');
      if (p && p.active) {
        s.x = p.x + 10;
        s.y = p.y - 9;
      }
    });

    // Update UFOs
    this.monsters.getChildren().forEach((child) => {
      const m = child as Phaser.Physics.Arcade.Sprite;
      if (m.frame.name === 'monster_ufo') {
        if (m.x < 20) m.setVelocityX(Math.abs(m.body!.velocity.x));
        else if (m.x > 220) m.setVelocityX(-Math.abs(m.body!.velocity.x));
      }
    });

    // Recycle platforms
    let highestPlatformY = Number.POSITIVE_INFINITY;
    this.platforms.getChildren().forEach((p) => {
      if ((p as Phaser.Physics.Arcade.Sprite).y < highestPlatformY) {
        highestPlatformY = (p as Phaser.Physics.Arcade.Sprite).y;
      }
    });

    this.platforms.getChildren().forEach((child) => {
      const platform = child as Phaser.Physics.Arcade.Sprite;
      if (platform.y > this.cameras.main.scrollY + 320) {
        platform.destroy();
        this.spawnPlatform(highestPlatformY - Phaser.Math.Between(40, 80));
      }
    });

    // Cleanup offscreen objects
    const cleanupGroup = (group: Phaser.Physics.Arcade.Group) => {
      group.getChildren().forEach((child) => {
        const sprite = child as Phaser.Physics.Arcade.Sprite;
        if (sprite.y > this.cameras.main.scrollY + 320) {
          sprite.destroy();
        }
      });
    };
    cleanupGroup(this.springs);
    cleanupGroup(this.monsters);
    cleanupGroup(this.coins);
    cleanupGroup(this.powerups);

    this.bullets.getChildren().forEach((child) => {
      const b = child as Phaser.Physics.Arcade.Sprite;
      if (b.y < this.cameras.main.scrollY - 20) {
        b.destroy();
      }
    });

    // Game Over condition
    if (this.player.y > this.cameras.main.scrollY + 320 && !this.isGameOver) {
      this.triggerGameOver();
    }
  }
}

class GameOverScene extends Phaser.Scene {
  score: number = 0;

  constructor() {
    super('GameOverScene');
  }

  init(data: { score: number }) {
    this.score = data.score;
  }

  create() {
    this.add.tileSprite(0, 0, 240, 320, 'doodlejump', 'bg_tile').setOrigin(0, 0);
    
    this.add.sprite(120, 100, 'doodlejump', 'ui_gameover');

    this.add.text(120, 160, `Score: ${this.score}`, {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(120, 220, 'Press ENTER\nto Restart', {
      fontSize: '16px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    this.input.keyboard!.on('keydown-ENTER', () => {
      this.sound.play('ui_click');
      this.scene.start('GameScene');
    });
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 240,
  height: 320,
  parent: 'app',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0, x: 0 },
      debug: false
    }
  },
  scene: [PreloadScene, MenuScene, GameScene, GameOverScene],
  pixelArt: true
};

new Phaser.Game(config);

function setupVirtualKeypad() {
  const triggerKey = (key: string, code: string, keyCode: number, isDown: boolean) => {
    const eventType = isDown ? 'keydown' : 'keyup';
    const event = new KeyboardEvent(eventType, {
      key: key,
      code: code,
      keyCode: keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
    } as any);
    window.dispatchEvent(event);
  };

  const bindButton = (id: string, key: string, code: string, keyCode: number) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    
    const downHandler = (e: Event) => {
      e.preventDefault();
      triggerKey(key, code, keyCode, true);
    };
    
    const upHandler = (e: Event) => {
      e.preventDefault();
      triggerKey(key, code, keyCode, false);
    };

    btn.addEventListener('mousedown', downHandler);
    btn.addEventListener('mouseup', upHandler);
    btn.addEventListener('mouseleave', upHandler);
    
    btn.addEventListener('touchstart', downHandler, { passive: false });
    btn.addEventListener('touchend', upHandler, { passive: false });
    btn.addEventListener('touchcancel', upHandler, { passive: false });
  };

  bindButton('btn-left', 'ArrowLeft', 'ArrowLeft', 37);
  bindButton('btn-right', 'ArrowRight', 'ArrowRight', 39);
  bindButton('btn-up', 'ArrowUp', 'ArrowUp', 38);
  bindButton('btn-down', 'ArrowDown', 'ArrowDown', 40);
  bindButton('btn-enter', 'Enter', 'Enter', 13);
}

setupVirtualKeypad();
