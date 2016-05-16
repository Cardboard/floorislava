// 
//var gamepad = navigator.getGamepads()[0];
var TILESIZE = 64
var MAP_HEIGHT = 7;
var MAP_WIDTH = 10;
var TILES = 
    {' ': {move: false, rot: false, slide: false,
              barriers: [0,0,0,0]} // blocked at [ right, top, left, bottom ]
    ,
    // MOV chair
    '#': {move: true, rot: false, slide: false,
              barriers: [0,0,1,0]} // blocked at [ right, top, left, bottom ]
    ,
    '@': {move: true, rot: true, slide: false,
              barriers: [0,0,1,0]} // blocked at [ right, top, left, bottom ]
    };
var TWEENSPEED = 5;
var move_timer = 0;
var action_timer = 0;
var move_timer_time = 10; // min time between consecutive moves
var action_timer_time = 10; // min time between consecutive actions (jump / rotate / push)
var player = {x:0, y:0, dir:0, 
    newx:0, newy:0, tweenx:0, tweeny:0}; // [x, y, direction]
var map;
var map_default = []; // for resetting
var level_0 = { startx: 4, starty: 3, //[ (end_x, end_y), [objects], [directions] ] 
types: [
    '          ',
    '          ',
    '    #     ',
    '   #@#    ',
    '    #     ',
    '          ',
    '          '], 
dirs: [
    '          ',
    '          ',
    '    3     ',
    '   002    ',
    '    1     ',
    '          ',
    '          ']
};

// images
var img_player;
var img_movchair;
var img_rotchair;

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
    map['startx'] = level['startx'];
    map['starty'] = level['starty'];
    map['endx'] = level['endx'];
    map['endy'] = level['endy'];
    set_player_loc(map['startx'], map['starty']);
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
            var tileimg;
            switch (map[j][i]['type']) {
                case '#':
                    tileimg = img_movchair;
                    break;
                case '@':
                    tileimg = img_rotchair;
                    break;
                default:
                    tileimg = ' ';
            }
            if (tileimg != ' ') {
                rotate_sprite(canvas, tileimg, 
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
    // RIGHT
    if (key[KEY_RIGHT] && move_timer === 0) {
        if (player['dir'] === 0) {
            move(0, 1);
        }
        player['dir'] = 0;
        set_move_timer();
    }
    // LEFT
    if (key[KEY_LEFT] && move_timer === 0) {
        if (player['dir'] === 2) {
            move(2, 1);
        }
        player['dir'] = 2;
        set_move_timer();
    }
    // UP
    if (key[KEY_UP] && move_timer === 0) {
        if (player['dir'] === 1) {
            move(1, 1);
        }
        player['dir'] = 1;
        set_move_timer();
    }
    // DOWN
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
    // rotate
    if (key[KEY_C] && action_timer === 0) {
        rotate(player['dir'], player['x'], player['y']);
        set_action_timer();
    }
    // update the timers
    if (move_timer !== 0) move_timer -= 1;
    if (action_timer !== 0) action_timer -= 1;

}

// move a player to a new coordinate
function move(dir, dist) {
    var newx = player['x'];
    var newy = player['y'];
    // set default distance to 1
    mode = typeof mode !== 'undefined' ? mode : 1;
    // adjust position based on distance to be moved
    if (dir == 0) newx+=dist;
    if (dir == 1) newy-=dist;
    if (dir == 2) newx-=dist;
    if (dir == 3) newy+=dist;
    // check that the move is possible:
    var fail = false; // gets set to true if dist > 1 and we fail a check_move
    
    // checks if a tile we want to move onto is currently in motion, &
    // if so, don't allow the move
    if (map[newy][newx]['x'] != map[newy][newx]['newx']
        || map[newy][newx]['y'] != map[newy][newx]['newy']) {
            fail = true;
    }

    // check moves that are > 1 space
    if (dist > 1) { 
        // we need to check all possible spaces that the player will pass over,
        // and need to check that both the side we are moving from and the side
        // we are moving out of are free, otherwise don't even check the end tile
        // as we do below
        var tempnewx = player['x'];
        var tempnewy = player['y'];

        for (i=1; i<dist; i++) {
            if (dir == 0) tempnewx = player['x'] + i;
            if (dir == 1) tempnewy = player['x'] - i;
            if (dir == 2) tempnewy = player['y'] - i;
            if (dir == 3) tempnewy = player['y'] + i;

            // if any of the spaces we move over fail a check_move check
                // if the tile is lava we can ignore the check_move result
            if (map[tempnewy][tempnewx]['type'] != ' '
                // if there is a NON-LAVA tile, then the check_move for that tile needs to pass
                && !(check_move(player['x'], player['y'], tempnewx, tempnewy, dir))) {
                console.log("JUMPBLOCKED")
                fail = true; // don't really need this because we break i guess
                break;
            } 
        }
    }

    // check the start space and end space (above code checks in between spaces if dist > 1)
    if (!fail && (check_move(player['x'], player['y'], newx, newy, dir))) {
       // console.log('Player moved from (' + player[0] + ', ' + player[1] +
       //         ') to (' + x + ', ' + y + ')');
        //add_move(player[0], player[1], x, y, dir, TWEENSPEED);
        player['newx'] = newx;
        player['newy'] = newy;
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
   var tile_x = x + xadd;
   var tile_y = y + yadd;
   if (tile_x >= MAP_WIDTH || tile_x < 0 || tile_y >= MAP_HEIGHT || tile_y < 0) return false;
   // find tile that will be pushed (if possible) 
   if (map[tile_y][tile_x]['move']) {
       // make sure no blocks in the way of a pushable block
       if (map[tile_y+yadd][tile_x+xadd]['type'] === ' ') {
           // recurse for sliding tiles
           if (map[tile_y][tile_x]['slide']) {
               slide(dir, tile_x, tile_y, xadd, yadd);
               return;
           }
           // set the tiles' x and newx, so they animate
           map[tile_y][tile_x]['x'] = tile_x;
           map[tile_y][tile_x]['newx'] = tile_x + xadd;
           map[tile_y+yadd][tile_x+xadd]['x'] = tile_x;
           map[tile_y+yadd][tile_x+xadd]['newx'] = tile_x + xadd;
           map[tile_y][tile_x]['y'] = tile_y;
           map[tile_y][tile_x]['newy'] = tile_y + yadd;
           map[tile_y+yadd][tile_x+xadd]['y'] = tile_y;
           map[tile_y+yadd][tile_x+xadd]['newy'] = tile_y + yadd;

       }
   }
}

function slide(dir, x, y, xadd, yadd) {
    console.log(x+xadd, MAP_WIDTH);
    if (x + xadd < MAP_WIDTH
    &&  x + xadd >= 0
    &&  y + yadd < MAP_HEIGHT
    &&  y + yadd >= 0
    &&  map[y+yadd][x+xadd]['type'] == ' ') {
        console.log('sliding..', x+xadd, y+yadd);
        if (xadd > 0) xadd += 1;
        if (xadd < 0) xadd -= 1;
        if (yadd > 0) yadd += 1;
        if (yadd < 0) yadd -= 1;
        slide(dir, x, y, xadd, yadd);
    } else {
        console.log('*impact*');
        var tile_x = x;
        var tile_y = y;
        if (xadd > 0) xadd -= 1;
        if (xadd < 0) xadd += 1;
        if (yadd > 0) yadd -= 1;
        if (yadd < 0) yadd += 1;
        // set the tiles' x and newx, so they animate
        map[tile_y][tile_x]['x'] = tile_x;
        map[tile_y][tile_x]['newx'] = tile_x + xadd;
        map[tile_y+yadd][tile_x+xadd]['x'] = tile_x;
        map[tile_y+yadd][tile_x+xadd]['newx'] = tile_x + xadd;
        map[tile_y][tile_x]['y'] = tile_y;
        map[tile_y][tile_x]['newy'] = tile_y + yadd;
        map[tile_y+yadd][tile_x+xadd]['y'] = tile_y;
        map[tile_y+yadd][tile_x+xadd]['newy'] = tile_y + yadd;
    }
}

// rotate a block if possible
// TODO
function rotate(dir, x, y) {
   // find the offset from the player's tile of the tile to push
   var xadd = 0;
   var yadd = 0;
   if (dir === 0) xadd = 1;
   if (dir === 1) yadd = -1;
   if (dir === 2) xadd = -1;
   if (dir === 3) yadd = 1;
   var tile_x = x + xadd;
   var tile_y = y + yadd;
   if (tile_x >= MAP_WIDTH || tile_x < 0 || tile_y >= MAP_HEIGHT || tile_y < 0) return false;
   // find tile that will be pushed (if possible) 
   if (map[tile_y][tile_x]['move']) {
       // check for blocks in the way of a pushable block
       if (map[tile_y+yadd][tile_x+xadd]['type'] === ' ') {
           // recurse for sliding tileis
           if (map[tile_y][tile_x]['slide']) {
               slide(dir, tile_x, tile_y, xadd, yadd);
               return;
           }
           // set the tiles' x and newx, so they animate
           map[tile_y][tile_x]['x'] = tile_x;
           map[tile_y][tile_x]['newx'] = tile_x + xadd;
           map[tile_y+yadd][tile_x+xadd]['x'] = tile_x;
           map[tile_y+yadd][tile_x+xadd]['newx'] = tile_x + xadd;
           map[tile_y][tile_x]['y'] = tile_y;
           map[tile_y][tile_x]['newy'] = tile_y + yadd;
           map[tile_y+yadd][tile_x+xadd]['y'] = tile_y;
           map[tile_y+yadd][tile_x+xadd]['newy'] = tile_y + yadd;

       }
   }
}

// check if a player's intended move is possible
// return true if the movement is possible
function check_move(x, y, newx, newy, dir) {
    // if the map ends in either direction blocked
    if (player['x'] === 0 && dir === 2) return false;
    if (player['x'] === MAP_WIDTH-1 && dir === 0) return false;
    if (player['y'] === 0 && dir === 1) return false;
    if (player['y'] === MAP_HEIGHT-1 && dir === 3) return false;

    if (map[newy][newx]['type'] === ' ') {
        console.log(newx, newy);
        console.log("LAVA LAVA LAVA");
        return false;
    }

    // (dir + 2) % 4 checks the side opposite the side we are moving into
    // eg.   o        if we are moving left ONTO this object, then dir = 2,
    //     o   o <-   so then (dir+2)%4 = 0, meaning the right side must be 
    //       x        open, 0, for us to be able to move onto it, which is true.
    //               
    //     o          if instead we wanted to move up, dir=1, onto this object,
    //   o   o        then (dir+2)%4 = 3, which corrosponds to the bottom, which is
    //     x          1 in this case, so we cannot complete this move.
    //     ^
    //     |
    //
    // the blocked list for this object would be: [right, top, left, bottom] = [0,0,0,1]
    if ( !(is_blocked(newx, newy, (dir + 2) % 4, false))
    && !(is_blocked(x, y, (dir + 2) % 4, true)) ) {
        return true;
    }
    console.log("direction IS blocked");
    return false;
}

// check if tile has a barrier on a given side
function is_blocked(x, y, side, underneath) {
    if (underneath === true) {
        underneath = 2;
    } else {
        underneath = 0;
    }
    // get tile info from the map 
    var tile_type = map[y][x]['type'];
    var tile_dir = map[y][x]['dir'];
    var tile = map[y][x]['barriers'];
    var tile_rotated = [0,0,0,0];
    // the type of the tile gives us the default blocked-sides, so we must
    // "rotate" the object so the blocked-sides correspond to its rotated state
    tile_rotated[0] = tile[Math.abs((0-tile_dir)%4)];
    tile_rotated[1] = tile[Math.abs((1-tile_dir)%4)];
    tile_rotated[2] = tile[Math.abs((2-tile_dir)%4)];
    tile_rotated[3] = tile[Math.abs((3-tile_dir)%4)];
    console.log(tile_rotated, tile_rotated[(side+underneath)%4]);

    // return true if the tile has a barrier on the side
    // the player wishes to move into
    return (tile_rotated[(side + underneath) % 4] === 1);
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
               // tween the tiles until they reach their destination
               if (tile['newx'] !== tile['x']) {
                  var diffx = Math.abs(tile['x'] - tile['newx']);
                  if (tile['newx'] > tile['x']) {
                      tile['tweenx'] += TWEENSPEED;
                  }
                  else if (tile['newx'] < tile['x']) {
                      tile['tweenx'] -= TWEENSPEED;
                  }
               }
               if (tile['newy'] !== tile['y']) {
                  var diffy = Math.abs(tile['y'] - tile['newy']);
                  if (tile['newy'] > tile['y']) {
                      tile['tweeny'] += TWEENSPEED;
                  }
                  else if (tile['newy'] < tile['y']) {
                      tile['tweeny'] -= TWEENSPEED;
                  }
               }
               // swap tiles when they have completed their movement
               // TODO: swap tiles right away ? will fix the jump-onto-invisible-chairs-before-they-arrive bug ?
               if (Math.abs(tile['tweenx']) > TILESIZE * diffx) {
                   // swap tile and lava
                   swap_tiles(i, j, tile['newx'], tile['newy']);
               }
               if (Math.abs(tile['tweeny']) > TILESIZE * diffy) {
                   // swap tile and lava
                   swap_tiles(i, j, tile['newx'], tile['newy']);
               }

           }
       }
   }
}

// flip tiles
function swap_tiles(x, y, newx, newy) {
     // swap tile and lava
     console.log("hot swap...");
     var old_tile = map[y][x];
     var new_tile = map[newy][newx];
     // flip the two tiles
     map[y][x] = new_tile;
     map[newy][newx] = old_tile;
     // update the newx and tweenx of the moved tile
     old_tile['newx'] = i;
     old_tile['tweenx'] = 0;
     old_tile['newy'] = j;
     old_tile['tweeny'] = 0;
     new_tile['newx'] = newx;
     new_tile['tweenx'] = 0;
     new_tile['newy'] = newx;
     new_tile['tweeny'] = 0;
}

// move the player without tweening
function set_player_loc(x, y) {
    player['x'] = x;
    player['newx'] = x;
    player['y'] = y;
    player['newy'] = y
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
    img_rotchair = load_bmp("data/rotchair.png");
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
