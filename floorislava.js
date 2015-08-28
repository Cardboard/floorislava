// 
var TILESIZE = 64
var MAP_HEIGHT = 7;
var MAP_WIDTH = 10;
var TILES = 
    {' ': {move: false, rot: false, slide: false,
              barriers: [0,0,0,0]} // blocked at [ right, top, left, down ]
    ,
    '#': {move: true, rot: false, slide: false,
              barriers: [0,0,1,0]} // blocked at [ right, top, left, down ]
    };
var TWEENSPEED = 5;
var move_timer = 0;
var action_timer = 0;
var move_timer_time = 10;
var action_timer_time = 10;
var player = {x:0, y:3, dir:0, 
    newx:0, newy:3, tweenx:0, tweeny:0}; // [x, y, direction]
var map;
var map_default = []; // for resetting
var level_0 = { startx: 4, starty: 0, //[ (end_x, end_y), [objects], [directions] ] 
types: [
    '    #     ',
    '    #     ',
    '    #     ',
    '### #     ',
    ' #        ',
    ' #        ',
    '          '], 
dirs: [
    '    0     ',
    '    0     ',
    '    0     ',
    '131 3     ',
    ' 0        ',
    ' 0        ',
    '          ']
};

// images
var img_player;
var img_movchair;

// audio

// FUNCTIONS //

// convert the map to an array of tile objects
function level2map(level) {
    map = []
    var newtile;
    var newrow = [];
    for (j=0; j<MAP_HEIGHT; j++) {
        for (i=0; i<MAP_WIDTH; i++) {
            var type = level['types'][j][i];
            var dir = level['dirs'][j][i];
            newtile = {x: i, y: j,
                type: type,
                dir: dir,
                move: TILES[type]['move'],
                rot: TILES[type]['rot'],
                slide:TILES[type]['slide'],
                barriers: TILES[type]['barriers'],
                newx: i, newy: j, tweenx: 0, tweeny: 0};
            // add the tile to the row of tiles
            newrow.push(newtile);
        }
    // add the row the the map, then start a new row
    map.push(newrow);
    newrow = [];
    }
}



// draw everything to the screen
function draw() {
    // BG
    clear_to_color(canvas,makecol(255,85, 85));

    // TILES
    // iterate over all tiles and draw them
    // j=y, i=x
    for (var j = 0; j < MAP_HEIGHT; j++) {
        for (var i = 0; i < MAP_WIDTH; i++) {
            if (map[j][i]['type'] == '#') {
                rotate_sprite(canvas, img_movchair, 
                              coord2pos(i)+map[j][i]['tweenx'], coord2pos(j)+map[j][i]['tweeny'],
                              int2dir(map[j][i]['dir']));
            }
        }
    }

    // PLAYER
    rotate_sprite(canvas, img_player,
                  coord2pos(player['x'])+player['tweenx'], coord2pos(player['y'])+player['tweeny'],
                  int2dir(player['dir']));
}
    
// handle keypresses and updating the game's state
function update() {
    // tweens
    tween();
    tween_tiles();
    // keypresses
    if (key[KEY_RIGHT] && move_timer === 0) {
        if (player['dir'] === 0) {
            move(0, 1);
        }
        player['dir'] = 0;
        set_move_timer();
    }
    if (key[KEY_LEFT] && move_timer === 0) {
        if (player['dir'] === 2) {
            move(2, 1);
        }
        player['dir'] = 2;
        set_move_timer();
    }
    if (key[KEY_UP] && move_timer === 0) {
        if (player['dir'] === 1) {
            move(1, 1);
        }
        player['dir'] = 1;
        set_move_timer();
    }
    if (key[KEY_DOWN] && move_timer === 0) {
        if (player['dir'] === 3) {
            move(3, 1);
        }
        player['dir'] = 3;
        set_move_timer();
    }
    // jump!
    if (key[KEY_Z] && action_timer === 0) {
        move(player['dir'], 2);
        console.log('JUMP!');
        set_action_timer();
        set_move_timer(); //@ GET RID OF THIS?
    }
    // push!
    if (key[KEY_X] && action_timer === 0) {
        push(player['dir'], player['x'], player['y']);
        set_action_timer();
    }
    // update the timers
    if (move_timer !== 0) move_timer -= 1;
    if (action_timer !== 0) action_timer -= 1;

}

// move a player to a new coordinate
function move(dir, dist) {
    var x = player['x'];
    var y = player['y'];
    // set default distance to 1
    mode = typeof mode !== 'undefined' ? mode : 1;
    // adjust position based on distance to be moved
    if (dir == 0) x+=dist;
    if (dir == 1) y-=dist;
    if (dir == 2) x-=dist;
    if (dir == 3) y+=dist;
    // check that the move is possible
    if (check_move(x, y, dir)) {
       // console.log('Player moved from (' + player[0] + ', ' + player[1] +
       //         ') to (' + x + ', ' + y + ')');
        //add_move(player[0], player[1], x, y, dir, TWEENSPEED);
        player['newx'] = x;
        player['newy'] = y;
    }
}

// push a block if possible
function push(dir, x, y) {
   // find the offset from the player's tile of the tile to push
   var xadd = 0;
   var yadd = 0;
   if (dir === 0) xadd = 1;
   if (dir === 1) yadd = -1;
   if (dir === 2) xadd = -1;
   if (dir === 3) yadd = 1;
   var tilex = x + xadd;
   var tiley = y + yadd;
   // find tile that will be pushed (if possible) 
   if (map[tiley][tilex]['move']) {
       // check for blocks in the way of a pushable block
       if (map[tiley+yadd][tilex+xadd]['type'] === ' ') {
           // move the tile
           map[tiley][tilex]['newx'] = map[tiley][tilex]['x'] + xadd;
           map[tiley][tilex]['newy'] = map[tiley][tilex]['y'] + yadd;
           console.log(tilex, tilex+xadd);
           console.log('Moving tile', map[tiley][tilex]['x'], map[tiley][tilex]['newx']);
           // recurse for sliding tiles
           if (map[tiley][tilex]['slide']) push(dir, tilex+xadd, tiley+yadd);
       }
   }


}

// check if a player's intended move is possible
// return true if the movement is possible
function check_move(newx, newy, dir) {
    if (map[newy][newx]['type'] === ' ') {
        console.log(newx, newy);
        console.log("LAVA LAVA LAVA");
        return false;
    }
    if ( !(is_blocked(newx, newy, (dir + 2) % 4)) ) {
        return true;
    }
    console.log("direction IS blocked");
    return false;
}

// check if tile has a barrier on a given side
function is_blocked(x, y, side) {
    // if the map ends in either direction blocked
    if (player['x'] === 0 && side === 0) return true;
    if (player['x'] === MAP_WIDTH && side === 2) return true;
    if (player['y'] === 0 && side === 1) return true;
    if (player['y'] === MAP_HEIGHT && side === 3) return true;
    // get tile info from the map 
    var tile_type = map[y][x]['type'];
    var tile_dir = map[y][x]['dir'];
    var tile = map[y][x]['barriers'];
    var tile_rotated = [0,0,0,0];
    tile_rotated[0] = tile[Math.abs((0-tile_dir)%4)];
    tile_rotated[1] = tile[Math.abs((1-tile_dir)%4)];
    tile_rotated[2] = tile[Math.abs((2-tile_dir)%4)];
    tile_rotated[3] = tile[Math.abs((3-tile_dir)%4)];

    // return true if the tile has a barrier on the side
    // the player wishes to move into
    return (tile_rotated[side] == 1);
}

// move the player from one position to another with in-between frames
function tween() {
   if (player['newx'] !== player['x']) {
      var diffx = Math.abs(player['x'] - player['newx']);

      if (player['newx'] > player['x']) {
          player['tweenx'] += TWEENSPEED;
          if (Math.abs(player['tweenx']) > TILESIZE * diffx) {
              player['x'] = player['newx'];
              player['tweenx'] = 0;
          }
      }
      else if (player['newx'] < player['x']) {
          player['tweenx'] -= TWEENSPEED;
          if (Math.abs(player['tweenx']) > TILESIZE * diffx) {
              player['x'] = player['newx'];
              player['tweenx'] = 0;
          }
      }
   }
   if (player['newy'] !== player['y']) {
      var diffy = Math.abs(player['y'] - player['newy']);

      if (player['newy'] > player['y']) {
          player['tweeny'] += TWEENSPEED;
          if (Math.abs(player['tweeny']) > TILESIZE * diffy) {
              player['y'] = player['newy'];
              player['tweeny'] = 0;
          }
      }
      else if (player['newy'] < player['y']) {
          player['tweeny'] -= TWEENSPEED;
          if (Math.abs(player['tweeny']) > TILESIZE * diffy) {
              player['y'] = player['newy'];
              player['tweeny'] = 0;
          }
      }
   }
}

// move the player from one position to another with in-between frames
function tween_tiles() {
   for (j=0; j<MAP_HEIGHT; j++) {
       for (i=0; i<MAP_WIDTH; i++) {
           var tile = map[j][i];
           if (map[j][i]['type'] !== ' ') {

              if (tile['newx'] !== tile['x']) {
                 var diffx = Math.abs(tile['x'] - tile['newx']);

                 if (tile['newx'] > tile['x']) {
                     tile['tweenx'] += TWEENSPEED;
                     if (Math.abs(tile['tweenx']) > TILESIZE * diffx) {
                         // swap tile and lava
                         console.log("hot swap...");
                         var newx = tile['newx'];
                         var newy = tile['newy'];
                         // flip the tiles..
                         var temp = map[j][i];
                         map[j][i] = map[newy][newx];
                         map[newy][newx] = temp;
                         // then tell the tile it is done moving
                         tile['newx'] = tile[newx];
                         tile['tweenx'] = 0;
                     }
                 }
                 else if (tile['newx'] < tile['x']) {
                     tile['tweenx'] -= TWEENSPEED;
                     if (Math.abs(tile['tweenx']) > TILESIZE * diffx) {
                         // swap tile and lava
                         var newx = tile['newx'];
                         var newy = tile['newy'];
                         console.log("hot swap...", tile['x'], tile['newx'], newx);
                         // flip the tiles..
                         var temp = map[j][i];
                         map[j][i] = map[newy][newx];
                         map[newy][newx] = temp;
                         // then tell the tile it is done moving
                         tile['x'] = tile[newx];
                         tile['newx'] = tile[newx];
                         tile['tweenx'] = 0;
                     }
                 }
              }
              if (tile['newy'] !== tile['y']) {
                 var diffy = Math.abs(tile['y'] - tile['newy']);

                 if (tile['newy'] > tile['y']) {
                     tile['tweeny'] += TWEENSPEED;
                     if (Math.abs(tile['tweeny']) > TILESIZE * diffy) {
                         tile['y'] = tile['newy'];
                         tile['tweeny'] = 0;
                     }
                 }
                 else if (tile['newy'] < tile['y']) {
                     tile['tweeny'] -= TWEENSPEED;
                     if (Math.abs(tile['tweeny']) > TILESIZE * diffy) {
                         tile['y'] = tile['newy'];
                         tile['tweeny'] = 0;
                     }
                 }
              }

           }
       }
   }
}
// sets the players move timer to its default value
function set_move_timer() {
    move_timer = move_timer_time;
}

// sets the players rotate timer to its default value
function set_action_timer() {
    action_timer = action_timer_time;
}

// convert an int to a direction, in degrees
// 0: right, 1: up, 2: left, 3: down
function int2dir (i) {
    dir = i * 90;
    return dir;
}

// convert a coordinate to a canvas position
function coord2pos(coord) {
    var pos;
    pos = coord * TILESIZE + TILESIZE/2;
    return pos;
}

// convert a canvas position to a coordinate
function pos2coord(pos) {
    var coord;
    coord = Math.floor(pos / 64);
    return coord;
}

// main
function main() {
    enable_debug('debug');
    allegro_init_all("canvas", MAP_WIDTH * TILESIZE, MAP_HEIGHT * TILESIZE);
    // load stuff
    img_player = load_bmp("data/player.png");
    img_movchair = load_bmp("data/movchair.png");
    // set level
    map = level_0;
    level2map(level_0);
    //
    ready(function() {
        loop(function() {
            update();
            draw();
        }, BPS_TO_TIMER(60));
    });
    return 0;
}
END_OF_MAIN();
