// Generated by CoffeeScript 1.6.2
(function() {
  var Main, Storage, stopPropagation, zip,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  String.prototype.trimmed = function(length) {
    if (this.length > length) {
      return "" + (this.substring(0, length)) + "...";
    }
    return this;
  };

  String.prototype.contains = function(str, case_sensitive) {
    if (case_sensitive == null) {
      case_sensitive = false;
    }
    if (case_sensitive) {
      return this.indexOf(str) !== -1;
    } else {
      return this.toLowerCase().indexOf(str.toLowerCase()) !== -1;
    }
  };

  zip = function() {
    var arr, i, length, lengthArray, _i, _results;

    lengthArray = (function() {
      var _i, _len, _results;

      _results = [];
      for (_i = 0, _len = arguments.length; _i < _len; _i++) {
        arr = arguments[_i];
        _results.push(arr.length);
      }
      return _results;
    }).apply(this, arguments);
    length = Math.min.apply(Math, lengthArray);
    _results = [];
    for (i = _i = 0; 0 <= length ? _i < length : _i > length; i = 0 <= length ? ++_i : --_i) {
      _results.push((function() {
        var _j, _len, _results1;

        _results1 = [];
        for (_j = 0, _len = arguments.length; _j < _len; _j++) {
          arr = arguments[_j];
          _results1.push(arr[i]);
        }
        return _results1;
      }).apply(this, arguments));
    }
    return _results;
  };

  stopPropagation = function(event) {
    event.preventDefault();
    return event.stopPropagation();
  };

  Storage = (function() {
    function Storage() {}

    Storage.prototype.getSearchMode = function() {
      if (!localStorage["search_mode"]) {
        this.setSearchMode('key');
      }
      return localStorage["search_mode"];
    };

    Storage.prototype.setSearchMode = function(mode) {
      return localStorage["search_mode"] = mode;
    };

    Storage.prototype.getFolderMode = function() {
      if (!localStorage["folder_mode"]) {
        this.setFolderMode('last');
      }
      return localStorage["folder_mode"];
    };

    Storage.prototype.setFolderMode = function(mode) {
      return localStorage["folder_mode"] = mode;
    };

    Storage.prototype.getDefaultFolder = function() {
      if (!localStorage["default_folder"]) {
        this.setDefaultFolder('0');
      }
      return localStorage["default_folder"];
    };

    Storage.prototype.setDefaultFolder = function(id) {
      return localStorage["default_folder"] = id;
    };

    return Storage;

  })();

  Main = (function() {
    Main.prototype.MAX_ITEM_TITLE_LENGTH = 35;

    Main.prototype.MAX_FOLDER_TITLE_LENGTH = 35;

    function Main() {
      this._onCut = __bind(this._onCut, this);
      var folder_mode, search_mode;

      this.storage = new Storage();
      this.current_node = this.storage.getDefaultFolder();
      this._updateDefaultDisplay();
      this.bookmark_list = '#bookmarks > ul';
      this.previous_query = '';
      this.settings_visible = false;
      this.edit_mode = false;
      this.edit_id = null;
      this.grabbed = false;
      this.index_over = null;
      this.cut_items = [];
      $('#clear-button').hide();
      $('#edit-buttons').hide();
      $('#cut-box').hide();
      $('#no-results').hide();
      $('#settings-window').hide();
      $('#drag-placeholder').hide();
      search_mode = this.storage.getSearchMode();
      $("input:radio[value='" + search_mode + "']").attr('checked', true);
      folder_mode = this.storage.getFolderMode();
      $("input:radio[value='" + folder_mode + "']").attr('checked', true);
      if (folder_mode !== 'specific') {
        $('#current-default').hide();
        $('#default-folder-button').hide();
      }
      this._hideEditBoxes();
      this._setupBindings();
    }

    Main.prototype.dumpBookmarks = function(query) {
      var callback,
        _this = this;

      $('#display-bar').hide();
      $(this.bookmark_list).empty();
      if (this.edit_mode) {
        this._toggleEditMode();
      }
      callback = function(tree_nodes) {
        _this._dumpTreeNodes(tree_nodes, query);
        if ($(_this.bookmark_list).text()) {
          return $('#no-results').hide();
        } else {
          return $('#no-results').show();
        }
      };
      return chrome.bookmarks.getTree(callback);
    };

    Main.prototype.dumpChildren = function(root) {
      var callback,
        _this = this;

      if (root == null) {
        root = this.current_node;
      }
      $('#no-results').hide();
      $('#display-bar').show();
      this._updateBreadCrumbs();
      root = '' + root;
      $(this.bookmark_list).empty();
      callback = function(tree_nodes) {
        return _this._dumpTreeNodes(tree_nodes);
      };
      return chrome.bookmarks.getChildren(root, callback);
    };

    Main.prototype._dumpTreeNodes = function(nodes, query) {
      var item, items, node, _i, _len, _results;

      items = (function() {
        var _i, _len, _results;

        _results = [];
        for (_i = 0, _len = nodes.length; _i < _len; _i++) {
          node = nodes[_i];
          _results.push(this._dumpNode(node, query));
        }
        return _results;
      }).call(this);
      _results = [];
      for (_i = 0, _len = items.length; _i < _len; _i++) {
        item = items[_i];
        _results.push($(this.bookmark_list).append(item));
      }
      return _results;
    };

    Main.prototype._dumpNode = function(node, query) {
      var anchor, li, onMouseOverLi,
        _this = this;

      if (query) {
        if (node.children) {
          if (node.children.length > 0) {
            this._dumpTreeNodes(node.children, query);
          }
          return;
        } else {
          if (!String(node.title).contains(query)) {
            return;
          }
        }
      }
      li = $('<li>');
      anchor = this._getNodeAnchor(node, li);
      li.append(anchor);
      onMouseOverLi = function() {
        return _this.index_over = li.index();
      };
      li.hover(onMouseOverLi, function() {});
      return li;
    };

    Main.prototype._getNodeAnchor = function(node, li) {
      var anchor, img, item, label, nodes, onGetChildren, onHoverIn, onHoverOut, small_btns, x, y, _ref,
        _this = this;

      anchor = $('<a>');
      label = this._getNodeLabel(node);
      small_btns = this._getNodeSmallButtons(node, label, li, anchor);
      anchor.append(small_btns).append(label);
      if (node.url) {
        anchor.attr("href", node.url);
        anchor.addClass("item");
        img = "chrome://favicon/" + node.url;
        x = 112 / 2 - 8;
        y = 27;
        onHoverIn = function() {
          return anchor.css('background', "linear-gradient(rgba(0, 0, 0, 0),                                  rgba(0, 0, 0, 0.05),                                  rgba(0, 0, 0, 0.15)) top,                                  url(" + img + ") " + x + "px " + y + "px no-repeat,                                  rgb(255, 255, 255) top");
        };
        onHoverOut = function() {
          return anchor.css('background', "url(" + img + ") " + x + "px " + y + "px no-repeat,                                  rgb(255, 255, 255) top");
        };
        onHoverOut();
        anchor.hover(onHoverIn, onHoverOut);
      } else {
        onGetChildren = function(results) {
          if (results.length === 0) {
            return anchor.append($('<div>').text('Empty').addClass('empty'));
          }
        };
        chrome.bookmarks.getChildren(node.id, onGetChildren);
        anchor.click(function() {
          return _this._gotoNode(node.id);
        });
        anchor.addClass("folder");
      }
      anchor.attr('id', node.id);
      anchor.attr('title', node.title);
      nodes = (function() {
        var _i, _len, _ref, _results;

        _ref = this.cut_items;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          item = _ref[_i];
          _results.push(item.node.id);
        }
        return _results;
      }).call(this);
      if (_ref = node.id, __indexOf.call(nodes, _ref) >= 0) {
        anchor.css('border-color', 'rgb(0, 150, 0)');
      }
      return anchor;
    };

    Main.prototype._getNodeSmallButtons = function(node, label, li, anchor) {
      var cut_btn, delete_btn, edit_btn, move_btn, small_btns;

      delete_btn = this._getNodeSmallDelete(node, label);
      edit_btn = this._getNodeSmallEdit(node, label);
      cut_btn = this._getNodeSmallCut(node, label, anchor);
      move_btn = this._getNodeSmallMove(node, li);
      small_btns = $('<div>');
      small_btns.append(delete_btn).append(edit_btn);
      small_btns.append(cut_btn).append(move_btn);
      small_btns.addClass("small-btns");
      if (!this.edit_mode) {
        small_btns.hide();
      }
      return small_btns;
    };

    Main.prototype._getNodeSmallDelete = function(node, label) {
      var delete_btn, onDelete,
        _this = this;

      delete_btn = $('<div>');
      delete_btn.addClass("small-btn delete-btn");
      delete_btn.text("X");
      delete_btn.attr('title', "Delete");
      onDelete = function(event) {
        var onSuccess;

        stopPropagation(event);
        onSuccess = function() {
          _this._removeCutItem(node);
          return _this._refresh();
        };
        if (confirm("Are you sure you want to delete \"" + node.title + "\"?")) {
          return chrome.bookmarks.removeTree(node.id, onSuccess);
        }
      };
      delete_btn.click(onDelete);
      return delete_btn;
    };

    Main.prototype._getNodeSmallEdit = function(node, label) {
      var edit_btn, onEdit,
        _this = this;

      edit_btn = $('<div>');
      edit_btn.addClass("small-btn edit-btn");
      edit_btn.attr('title', "Edit");
      if (node.url) {
        onEdit = function(event) {
          stopPropagation(event);
          _this.edit_id = node.id;
          return _this._openEditItem(node.title, node.url);
        };
      } else {
        onEdit = function(event) {
          stopPropagation(event);
          _this.edit_id = node.id;
          return _this._openEditFolder(node.title);
        };
      }
      edit_btn.click(onEdit);
      return edit_btn;
    };

    Main.prototype._onCut = function(node, label_text) {
      var _this = this;

      return function(event) {
        stopPropagation(event);
        $('#' + node.id).css('border-color', 'rgb(0, 150, 0)');
        return _this._addCutItem(node, label_text);
      };
    };

    Main.prototype._getNodeSmallCut = function(node, label, anchor) {
      var cut_btn;

      cut_btn = $('<div>');
      cut_btn.addClass("small-btn cut-btn");
      cut_btn.attr('title', "Move to new folder");
      cut_btn.click(this._onCut(node, label.text()));
      return cut_btn;
    };

    Main.prototype._getNodeSmallMove = function(node, li) {
      var move_btn, onMoveClick, onMoveMouseDown,
        _this = this;

      move_btn = $('<div>');
      move_btn.addClass("small-btn move-btn");
      move_btn.attr('title', "Reposition");
      onMoveClick = function(event) {
        return stopPropagation(event);
      };
      onMoveMouseDown = function(event) {
        _this.grabbed = {
          element: li,
          pos: li.position(),
          index: li.index(),
          id: node.id
        };
        _this.grabbed.element.css('position', 'relative');
        _this._moveGrabbed(event.pageX, event.pageY);
        _this.grabbed.element.css('z-index', '100');
        $('#drag-placeholder').show();
        $('#drag-placeholder').css('left', _this.grabbed.pos.left);
        return $('#drag-placeholder').css('top', _this.grabbed.pos.top);
      };
      move_btn.click(onMoveClick);
      move_btn.mousedown(onMoveMouseDown);
      return move_btn;
    };

    Main.prototype._getNodeLabel = function(node) {
      var label;

      label = $('<span>');
      if (node.url) {
        label.text(node.title.trimmed(this.MAX_ITEM_TITLE_LENGTH));
      } else {
        label.text(node.title.trimmed(this.MAX_FOLDER_TITLE_LENGTH));
      }
      return label;
    };

    Main.prototype._updateBreadCrumbs = function() {
      var draw, handleNode, onget,
        _this = this;

      draw = function(nodes) {
        var append_node, arr, crumbs_list, min_width, node, _i, _j, _len, _ref, _results;

        crumbs_list = $('#bread-crumbs > ol');
        crumbs_list.empty();
        append_node = function(node, make_button) {
          var li, span;

          span = $('<span>');
          li = $('<li>').append(span);
          span.text(node.title);
          if (make_button) {
            li.click(function() {
              return _this._gotoNode(node.id);
            });
          }
          li.append(span);
          return crumbs_list.append(li);
        };
        arr = zip(nodes.reverse(), (function() {
          _results = [];
          for (var _i = _ref = nodes.length - 1; _ref <= 0 ? _i <= 0 : _i >= 0; _ref <= 0 ? _i++ : _i--){ _results.push(_i); }
          return _results;
        }).apply(this));
        for (_j = 0, _len = arr.length; _j < _len; _j++) {
          node = arr[_j];
          append_node(node[0], node[1] > 0);
        }
        min_width = $('#bread-crumbs').width();
        return $('#container').css('min-width', min_width);
      };
      handleNode = function(node, nodes) {
        var onget;

        if (node.parentId) {
          nodes.push({
            title: node.title,
            id: node.id
          });
          onget = function(node) {
            return handleNode(node[0], nodes);
          };
          return chrome.bookmarks.get(node.parentId, onget);
        } else {
          if (node.id === '0') {
            nodes.push({
              title: "root",
              id: node.id
            });
          }
          return draw(nodes);
        }
      };
      onget = function(node) {
        return handleNode(node[0], []);
      };
      return chrome.bookmarks.get(this.current_node, onget);
    };

    Main.prototype._setupBindings = function() {
      var onCancelButton, onCancelMove, onClearSearch, onClickPage, onEditButton, onFolderRadio, onItemKeyPress, onKeyDown, onKeyPressFolder, onMouseUp, onMove, onNewFolder, onNewPage, onOkFolderButton, onOkItemButton, onPaste, onSearchEnter, onSearchKeyUp, onSearchRadio, onSetDefaultFolder, search,
        _this = this;

      search = function() {
        var query;

        query = $('#search').val();
        if (query) {
          if (query !== _this.previous_query) {
            _this.previous_query = query;
            return _this.dumpBookmarks(query);
          }
        } else {
          _this.previous_query = '';
          return _this._gotoNode(_this.storage.getDefaultFolder());
        }
      };
      onSearchKeyUp = function() {
        if ($('#search').val() !== '') {
          $('#clear-button').show();
        } else {
          $('#clear-button').hide();
        }
        if (_this.storage.getSearchMode() === 'key') {
          return search();
        }
      };
      $('#search').keyup(onSearchKeyUp);
      onSearchEnter = function() {
        if (_this.storage.getSearchMode() === 'enter') {
          return search();
        }
      };
      $('#search').change(onSearchEnter);
      onClearSearch = function() {
        if ($('#search').val() !== '') {
          $('#search').val('');
          $('#clear-button').hide();
          return _this._refresh();
        }
      };
      $('#clear-button').click(onClearSearch);
      onClickPage = function(event) {
        var parent_is_settings_window, settings_window_is_visible, target_is_settings_button, target_is_settings_window;

        parent_is_settings_window = $(event.target).parents().index($('#settings-window')) !== -1;
        target_is_settings_button = event.target.id === 'settings-button';
        target_is_settings_window = event.target.id === 'settings-window';
        settings_window_is_visible = $('#settings-window').is(":visible");
        if (parent_is_settings_window || target_is_settings_window) {
          return;
        }
        if (settings_window_is_visible) {
          if (target_is_settings_button || !parent_is_settings_window) {
            return $('#settings-window').hide();
          }
        } else if (target_is_settings_button) {
          return $('#settings-window').show();
        }
      };
      $(document).click(onClickPage);
      onSearchRadio = function() {
        var mode;

        mode = $("input:radio[name='search']:checked").val();
        return _this.storage.setSearchMode(mode);
      };
      $("input:radio[name='search']").click(onSearchRadio);
      onFolderRadio = function() {
        var mode;

        mode = $("input:radio[name='folder']:checked").val();
        console.log(mode);
        _this.storage.setFolderMode(mode);
        if (mode === 'specific') {
          $('#current-default').show();
          return $('#default-folder-button').show();
        } else {
          $('#current-default').hide();
          return $('#default-folder-button').hide();
        }
      };
      $("input:radio[name='folder']").click(onFolderRadio);
      onSetDefaultFolder = function() {
        _this.storage.setDefaultFolder(_this.current_node);
        return _this._updateDefaultDisplay();
      };
      $('#default-folder-button').click(onSetDefaultFolder);
      onEditButton = function() {
        return _this._toggleEditMode();
      };
      $('#edit-button').click(onEditButton);
      onCancelButton = function() {
        return _this._hideEditBoxes();
      };
      $('#edit-folder .cancel').click(onCancelButton);
      $('#edit-item .cancel').click(onCancelButton);
      onOkFolderButton = function() {
        var changes;

        changes = {
          title: $('#input-folder-name').val()
        };
        return chrome.bookmarks.update(_this.edit_id, changes, function() {
          _this._hideEditBoxes();
          return _this._refresh();
        });
      };
      $('#edit-folder .ok').click(onOkFolderButton);
      onKeyPressFolder = function(event) {
        if (event.which === 13) {
          onOkFolderButton();
          return false;
        }
      };
      $('#edit-folder form').keypress(onKeyPressFolder);
      onOkItemButton = function() {
        var changes;

        changes = {
          title: $('#input-item-name').val(),
          url: $('#input-item-url').val()
        };
        return chrome.bookmarks.update(_this.edit_id, changes, function() {
          _this._hideEditBoxes();
          return _this._refresh();
        });
      };
      $('#edit-item .ok').click(onOkItemButton);
      onItemKeyPress = function(event) {
        if (event.which === 13) {
          return onOkItemButton();
        }
      };
      $('#input-item-name').keypress(onItemKeyPress);
      $('#input-item-url').keypress(onItemKeyPress);
      onNewFolder = function() {
        var folder, onCreated;

        folder = {
          parentId: _this.current_node,
          title: "New Folder"
        };
        onCreated = function(new_node) {
          return _this._refresh();
        };
        return chrome.bookmarks.create(folder, onCreated);
      };
      $('#new-folder-button').click(onNewFolder);
      onNewPage = function() {
        var onCreated, page;

        page = {
          parentId: _this.current_node,
          title: "New Page",
          url: "chrome://newtab"
        };
        onCreated = function(new_node) {
          return _this._refresh();
        };
        return chrome.bookmarks.create(page, onCreated);
      };
      $('#new-page-button').click(onNewPage);
      onMove = function(event) {
        var n, nth_item;

        if (_this.grabbed) {
          if (_this.index_over !== _this.grabbed.index) {
            _this.grabbed.index = _this.index_over;
            _this.grabbed.element.detach();
            n = _this.index_over + 1;
            nth_item = $(_this.bookmark_list + " li:nth-child(" + n + ")");
            if (nth_item.length > 0) {
              nth_item.before(_this.grabbed.element);
            } else {
              $(_this.bookmark_list).append(_this.grabbed.element);
            }
            _this.grabbed.element.css('position', 'static');
            _this.grabbed.pos = _this.grabbed.element.position();
            _this.grabbed.element.css('position', 'relative');
            $('#drag-placeholder').css('left', _this.grabbed.pos.left);
            $('#drag-placeholder').css('top', _this.grabbed.pos.top);
          }
          return _this._moveGrabbed(event.pageX, event.pageY);
        }
      };
      $(document).mousemove(onMove);
      onMouseUp = function(event) {
        var destination;

        if (_this.grabbed) {
          onMove = function() {
            _this.grabbed.element.css('position', 'static');
            _this.grabbed.element.css('z-index', '0');
            _this.grabbed = false;
            return $('#drag-placeholder').hide();
          };
          destination = {
            parentId: _this.current_node,
            index: _this.grabbed.index
          };
          return chrome.bookmarks.move(_this.grabbed.id, destination, onMove);
        }
      };
      $(document).mouseup(onMouseUp);
      onPaste = function() {
        var destination, item, items, _i, _len, _results;

        destination = {
          parentId: _this.current_node
        };
        items = (function() {
          var _i, _len, _ref, _results;

          _ref = this.cut_items;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            item = _ref[_i];
            _results.push(item);
          }
          return _results;
        }).call(_this);
        _this._emptyCutItems();
        _this.count = 0;
        _this.number = items.length;
        _results = [];
        for (_i = 0, _len = items.length; _i < _len; _i++) {
          item = items[_i];
          onMove = function() {
            _this.count++;
            if (_this.count === _this.number) {
              return _this._refresh();
            }
          };
          _results.push(chrome.bookmarks.move(item.node.id, destination, onMove));
        }
        return _results;
      };
      $('#cut-box div.ok').click(onPaste);
      onCancelMove = function() {
        return _this._emptyCutItems();
      };
      $('#cut-box div.cancel').click(onCancelMove);
      onKeyDown = function(event) {
        if (event.ctrlKey && event.which === 86) {
          return onPaste();
        }
      };
      return $(document).keydown(onKeyDown);
    };

    Main.prototype._gotoNode = function(id) {
      if (this.storage.getFolderMode() === 'last') {
        this.storage.setDefaultFolder(id);
      }
      this.current_node = id;
      return this.dumpChildren();
    };

    Main.prototype._refresh = function() {
      return this._gotoNode(this.current_node);
    };

    Main.prototype._updateDefaultDisplay = function() {
      var onget;

      onget = function(node) {
        var title;

        title = node[0].title;
        if (!title) {
          title = "root";
        }
        return $('#current-default').text(title);
      };
      return chrome.bookmarks.get(this.storage.getDefaultFolder(), onget);
    };

    Main.prototype._toggleEditMode = function() {
      this.edit_mode = !this.edit_mode;
      if (this.edit_mode) {
        $('.small-btns').show();
        return $('#edit-buttons').show();
      } else {
        $('.small-btns').hide();
        return $('#edit-buttons').hide();
      }
    };

    Main.prototype._hideEditBoxes = function() {
      $('#grey-out').hide();
      $('#edit-folder').hide();
      $('#edit-item').hide();
      return this.edit_id = null;
    };

    Main.prototype._openEditFolder = function(name) {
      $('#grey-out').show();
      $('#edit-folder').show();
      $('#input-folder-name').val(name);
      return $('#input-folder-name').focus();
    };

    Main.prototype._openEditItem = function(name, url) {
      $('#grey-out').show();
      $('#edit-item').show();
      $('#input-item-name').val(name);
      $('#input-item-name').focus();
      return $('#input-item-url').val(url);
    };

    Main.prototype._moveGrabbed = function(x, y) {
      this.grabbed.element.css('left', x - this.grabbed.pos.left - 145);
      return this.grabbed.element.css('top', y - this.grabbed.pos.top + 5);
    };

    Main.prototype._addCutItem = function(node, label_text) {
      var btn, cut_item, div, e, item, list, onItemClick, _i, _len, _ref,
        _this = this;

      _ref = this.cut_items;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        e = _ref[_i];
        if (e.node === node) {
          return;
        }
      }
      list = $('#cut-items');
      item = $('<li>');
      div = $('<div>');
      div.addClass("cut-item");
      div.attr('title', "Remove from list");
      div.text(label_text);
      item.append(div);
      list.append(item);
      onItemClick = function() {
        return _this._removeCutItem(node);
      };
      div.click(onItemClick);
      btn = '#' + node.id + ' div.cut-btn';
      $(btn).click(onItemClick);
      $(btn).attr('title', "Deselect");
      cut_item = {
        node: node,
        item: item
      };
      this.cut_items.push(cut_item);
      $('#cut-box').show();
      return $('html').css('padding-bottom', $('#cut-box').outerHeight());
    };

    Main.prototype._removeCutItem = function(node) {
      var btn, cut_item, i, index, label_text, _i, _ref;

      index = -1;
      for (i = _i = 0, _ref = this.cut_items.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        if (this.cut_items[i].node === node) {
          index = i;
          break;
        }
      }
      if (index !== -1) {
        cut_item = this.cut_items[index];
        cut_item.item.remove();
        this.cut_items.splice(index, 1);
        if (this.cut_items.length === 0) {
          $('#cut-box').hide();
          $('html').css('padding-bottom', 0);
        }
        $('#' + node.id).css('border-color', '');
        label_text = $('#' + node.id + ' span').text();
        btn = '#' + node.id + ' div.cut-btn';
        $(btn).click(this._onCut(node, label_text));
        return $(btn).attr('title', "Move to new folder");
      }
    };

    Main.prototype._emptyCutItems = function() {
      var e, node, nodes, _i, _len, _results;

      nodes = (function() {
        var _i, _len, _ref, _results;

        _ref = this.cut_items;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          e = _ref[_i];
          _results.push(e.node);
        }
        return _results;
      }).call(this);
      _results = [];
      for (_i = 0, _len = nodes.length; _i < _len; _i++) {
        node = nodes[_i];
        _results.push(this._removeCutItem(node));
      }
      return _results;
    };

    return Main;

  })();

  jQuery(function() {
    var m;

    m = new Main();
    return m.dumpChildren();
  });

}).call(this);
