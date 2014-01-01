
String::trimmed = (length) ->
  if @length > length
    return "#{this.substring(0, length)}..."
  return @

String::contains = (str, case_sensitive=false) ->
  if case_sensitive
    return @indexOf(str) != -1
  else
    return @toLowerCase().indexOf(str.toLowerCase()) != -1

zip = () ->
  lengthArray = (arr.length for arr in arguments)
  length = Math.min(lengthArray...)
  (arr[i] for arr in arguments) for i in [0...length]

stopPropagation = (event) ->
  event.preventDefault() # for page links
  event.stopPropagation() # for foldersn

class Storage
  constructor: ->

  getSearchMode: ->
    if not localStorage["search_mode"]
      @setSearchMode('key')

    return localStorage["search_mode"]

  setSearchMode: (mode) ->
    localStorage["search_mode"] = mode

  getFolderMode: ->
    if not localStorage["folder_mode"]
      @setFolderMode('last')

    return localStorage["folder_mode"]

  setFolderMode: (mode) ->
    localStorage["folder_mode"] = mode

  getDefaultFolder: ->
    if not localStorage["default_folder"]
      @setDefaultFolder('0')

    return localStorage["default_folder"]

  setDefaultFolder: (id) ->
    localStorage["default_folder"] = id

class Main
  MAX_ITEM_TITLE_LENGTH: 35
  MAX_FOLDER_TITLE_LENGTH: 35

  constructor: ->
    @storage = new Storage()
    @current_node = @storage.getDefaultFolder()
    @_updateDefaultDisplay()
    @bookmark_list = '#bookmarks > ul'
    @previous_query = ''
    @settings_visible = false
    @edit_mode = false
    @edit_id = null
    @grabbed = false
    @index_over = null # index of last item hovered over
    @cut_items = []

    $('#clear-button').hide()
    $('#edit-buttons').hide()
    $('#cut-box').hide()
    $('#no-results').hide()
    $('#settings-window').hide()
    $('#drag-placeholder').hide()

    search_mode = @storage.getSearchMode()
    $("input:radio[value='" + search_mode + "']").attr('checked', true)

    folder_mode = @storage.getFolderMode()
    $("input:radio[value='" + folder_mode + "']").attr('checked', true)

    if folder_mode isnt 'specific'
      $('#current-default').hide()
      $('#default-folder-button').hide()

    @_hideEditBoxes()

    @_setupBindings()

  dumpBookmarks: (query) ->
    $('#display-bar').hide()
    $(@bookmark_list).empty()
    if @edit_mode
      @_toggleEditMode()

    callback = (tree_nodes) =>
      @_dumpTreeNodes(tree_nodes, query)
      if $(@bookmark_list).text()
        $('#no-results').hide()
      else
        $('#no-results').show()

    chrome.bookmarks.getTree(callback)

  dumpChildren: (root=@current_node) ->
    $('#no-results').hide()
    $('#display-bar').show()
    @_updateBreadCrumbs()

    root = '' + root
    $(@bookmark_list).empty()

    callback = (tree_nodes) =>
      @_dumpTreeNodes(tree_nodes)

    chrome.bookmarks.getChildren(root, callback)

  _dumpTreeNodes: (nodes, query) ->
    items = (@_dumpNode(node, query) for node in nodes)
    $(@bookmark_list).append(item) for item in items

  _dumpNode: (node, query) ->
    if query
      if node.children
        if node.children.length > 0
          @_dumpTreeNodes(node.children, query)
        return
      else
        if not String(node.title).contains(query) then return

    li = $('<li>')
    anchor = @_getNodeAnchor(node, li)
    li.append(anchor)

    onMouseOverLi = =>
      @index_over = li.index()

    li.hover(onMouseOverLi, ()->)

    return li

  _getNodeAnchor: (node, li) ->
    anchor = $('<a>')
    label = @_getNodeLabel(node)
    small_btns = @_getNodeSmallButtons(node, label, li, anchor)
    anchor.append(small_btns).append(label)
    if node.url
      anchor.attr("href", node.url)
      anchor.addClass("item")

      img = "chrome://favicon/" + node.url
      x = 112 / 2 - 8 # (anchor width) / 2 - (half icon width)
      y = 27;

      onHoverIn = ->
        anchor.css('background', "linear-gradient(rgba(0, 0, 0, 0),
                                  rgba(0, 0, 0, 0.05),
                                  rgba(0, 0, 0, 0.15)) top,
                                  url(#{img}) #{x}px #{y}px no-repeat,
                                  rgb(255, 255, 255) top")

      onHoverOut = ->
        anchor.css('background', "url(#{img}) #{x}px #{y}px no-repeat,
                                  rgb(255, 255, 255) top")

      onHoverOut()

      anchor.hover(onHoverIn, onHoverOut)
    else
      onGetChildren = (results) =>
        if results.length is 0
          anchor.append($('<div>').text('Empty').addClass('empty'))

      chrome.bookmarks.getChildren(node.id, onGetChildren)

      anchor.click(() => @_gotoNode(node.id))
      anchor.addClass("folder")

    anchor.attr('id', node.id)
    anchor.attr('title', node.title)

    nodes = (item.node.id for item in @cut_items)
    if node.id in nodes
      anchor.css('border-color', 'rgb(0, 150, 0)')

    return anchor

  _getNodeSmallButtons: (node, label, li, anchor) ->
    delete_btn = @_getNodeSmallDelete(node, label)
    edit_btn = @_getNodeSmallEdit(node, label)
    cut_btn = @_getNodeSmallCut(node, label, anchor)
    move_btn = @_getNodeSmallMove(node, li)
    small_btns = $('<div>')
    small_btns.append(delete_btn).append(edit_btn)
    small_btns.append(cut_btn).append(move_btn)

    small_btns.addClass("small-btns")

    if not @edit_mode
      small_btns.hide()

    return small_btns

  _getNodeSmallDelete: (node, label) ->
    delete_btn = $('<div>')
    delete_btn.addClass("small-btn delete-btn")
    delete_btn.text("X")
    delete_btn.attr('title', "Delete")

    onDelete = (event) =>
      stopPropagation(event)
      onSuccess = =>
        @_removeCutItem(node) # careful not to leave in deleted items
        @_refresh()
      if confirm("Are you sure you want to delete \"" + node.title + "\"?")
        chrome.bookmarks.removeTree(node.id, onSuccess)

    delete_btn.click(onDelete)

    return delete_btn

  _getNodeSmallEdit: (node, label) ->
    edit_btn = $('<div>')
    edit_btn.addClass("small-btn edit-btn")
    edit_btn.attr('title', "Edit")
    if node.url
      onEdit = (event) =>
        stopPropagation(event)
        @edit_id = node.id
        @_openEditItem(node.title, node.url)
    else
      onEdit = (event) =>
        stopPropagation(event)
        @edit_id = node.id
        @_openEditFolder(node.title)

    edit_btn.click(onEdit)

    return edit_btn

  _onCut: (node, label_text) =>
    return (event) =>
      stopPropagation(event)
      $('#' + node.id).css('border-color', 'rgb(0, 150, 0)')
      @_addCutItem(node, label_text)


  _getNodeSmallCut: (node, label, anchor) ->
    cut_btn = $('<div>')
    cut_btn.addClass("small-btn cut-btn")
    cut_btn.attr('title', "Move to new folder")

    cut_btn.click(@_onCut(node, label.text()))

    return cut_btn

  _getNodeSmallMove: (node, li) ->
    move_btn = $('<div>')
    move_btn.addClass("small-btn move-btn")
    move_btn.attr('title', "Reposition")

    onMoveClick = (event) =>
      stopPropagation(event)

    onMoveMouseDown = (event) =>
      @grabbed = {
        element: li,
        pos: li.position(),
        index: li.index(),
        id: node.id
      }
      @grabbed.element.css('position', 'relative')
      @_moveGrabbed(event.pageX, event.pageY)
      @grabbed.element.css('z-index', '100')

      $('#drag-placeholder').show()
      $('#drag-placeholder').css('left', @grabbed.pos.left)
      $('#drag-placeholder').css('top', @grabbed.pos.top)

    move_btn.click(onMoveClick)
    move_btn.mousedown(onMoveMouseDown)

    return move_btn

  _getNodeLabel: (node) ->
    label = $('<span>')
    if node.url
      label.text(node.title.trimmed(@MAX_ITEM_TITLE_LENGTH))
    else
      label.text(node.title.trimmed(@MAX_FOLDER_TITLE_LENGTH))

    return label

  _updateBreadCrumbs: ->
    draw = (nodes) =>
      crumbs_list = $('#bread-crumbs > ol')
      crumbs_list.empty()
      append_node = (node, make_button) =>
        span = $('<span>')
        li = $('<li>').append(span)
        span.text(node.title)
        if make_button
          li.click(() => @_gotoNode(node.id))
        li.append(span)
        crumbs_list.append(li)

      arr = zip(nodes.reverse(), [nodes.length-1..0])
      append_node(node[0], node[1] > 0) for node in arr

      min_width = $('#bread-crumbs').width()
      $('#container').css('min-width', min_width)

    handleNode = (node, nodes) ->
      if node.parentId
        nodes.push({
          title: node.title,
          id: node.id
        })

        onget = (node) ->
          handleNode(node[0], nodes)

        chrome.bookmarks.get(node.parentId, onget)
      else
        if node.id is '0'
          nodes.push({
            title: "root",
            id: node.id
          })
        draw(nodes)

    onget = (node) ->
      handleNode(node[0], [])

    chrome.bookmarks.get(@current_node, onget)

  _setupBindings: ->
    search = =>
      query = $('#search').val()
      if query
        if query isnt @previous_query
          @previous_query = query
          @dumpBookmarks(query)
      else
        @previous_query = ''
        @_gotoNode(@storage.getDefaultFolder())

    onSearchKeyUp = =>
      if $('#search').val() isnt ''
        $('#clear-button').show()
      else
        $('#clear-button').hide()
      if @storage.getSearchMode() is 'key'
        search()

    $('#search').keyup(onSearchKeyUp)

    onSearchEnter = =>
      if @storage.getSearchMode() is 'enter'
        search()

    $('#search').change(onSearchEnter)

    onClearSearch = =>
      if $('#search').val() isnt ''
        $('#search').val('')
        $('#clear-button').hide()
        @_refresh()

    $('#clear-button').click(onClearSearch)

    onClickPage = (event) =>
      # Handle showing/hiding settings
      parent_is_settings_window =
        $(event.target).parents().index($('#settings-window')) != -1
      target_is_settings_button = event.target.id == 'settings-button'
      target_is_settings_window = event.target.id == 'settings-window'
      settings_window_is_visible = $('#settings-window').is(":visible")

      if parent_is_settings_window or target_is_settings_window
        return

      if settings_window_is_visible
        if target_is_settings_button or not parent_is_settings_window
          $('#settings-window').hide()
      else if target_is_settings_button
          $('#settings-window').show()

    $(document).click(onClickPage)

    onSearchRadio = =>
      mode = $("input:radio[name='search']:checked").val()
      @storage.setSearchMode(mode)

    $("input:radio[name='search']").click(onSearchRadio)

    onFolderRadio = =>
      mode = $("input:radio[name='folder']:checked").val()
      console.log(mode)
      @storage.setFolderMode(mode)
      if mode is 'specific'
        $('#current-default').show()
        $('#default-folder-button').show()
      else
        $('#current-default').hide()
        $('#default-folder-button').hide()

    $("input:radio[name='folder']").click(onFolderRadio)

    onSetDefaultFolder = =>
      @storage.setDefaultFolder(@current_node)
      @_updateDefaultDisplay()

    $('#default-folder-button').click(onSetDefaultFolder)

    onEditButton = =>
      @_toggleEditMode()

    $('#edit-button').click(onEditButton)

    onCancelButton = =>
      @_hideEditBoxes()

    $('#edit-folder .cancel').click(onCancelButton)
    $('#edit-item .cancel').click(onCancelButton)

    onOkFolderButton = =>
      changes = {
        title: $('#input-folder-name').val()
      }
      chrome.bookmarks.update(@edit_id, changes, () =>
        @_hideEditBoxes()
        @_refresh()
      )

    $('#edit-folder .ok').click(onOkFolderButton)

    onKeyPressFolder = (event) =>
      if event.which is 13
        onOkFolderButton()
        return false #prevents page from reloading

    $('#edit-folder form').keypress(onKeyPressFolder)

    onOkItemButton = =>
      changes = {
        title: $('#input-item-name').val(),
        url: $('#input-item-url').val()
      }
      chrome.bookmarks.update(@edit_id, changes, () =>
        @_hideEditBoxes()
        @_refresh()
      )

    $('#edit-item .ok').click(onOkItemButton)

    onItemKeyPress = (event) =>
      if event.which is 13 # Enter
        onOkItemButton()

    $('#input-item-name').keypress(onItemKeyPress)
    $('#input-item-url').keypress(onItemKeyPress)

    onNewFolder = =>
      folder = {
        parentId: @current_node,
        title: "New Folder"
      }
      onCreated = (new_node) =>
        @_refresh()
      chrome.bookmarks.create(folder, onCreated)

    $('#new-folder-button').click(onNewFolder)

    onNewPage = =>
      page = {
        parentId: @current_node,
        title: "New Page",
        url: "chrome://newtab"
      }
      onCreated = (new_node) =>
        @_refresh()
      chrome.bookmarks.create(page, onCreated)

    $('#new-page-button').click(onNewPage)

    onMove = (event) =>
      if @grabbed
        if @index_over isnt @grabbed.index
          @grabbed.index = @index_over
          @grabbed.element.detach()
          n = @index_over + 1
          nth_item = $(@bookmark_list + " li:nth-child(" + n + ")")
          if nth_item.length > 0
            nth_item.before(@grabbed.element)
          else
            $(@bookmark_list).append(@grabbed.element)

          @grabbed.element.css('position', 'static')
          @grabbed.pos = @grabbed.element.position()
          @grabbed.element.css('position', 'relative')
          $('#drag-placeholder').css('left', @grabbed.pos.left)
          $('#drag-placeholder').css('top', @grabbed.pos.top)


        @_moveGrabbed(event.pageX, event.pageY)

    $(document).mousemove(onMove)

    onMouseUp = (event) =>
      if @grabbed
        onMove = =>
          @grabbed.element.css('position', 'static')
          @grabbed.element.css('z-index', '0')
          @grabbed = false
          $('#drag-placeholder').hide()

        destination = {parentId: @current_node, index: @grabbed.index}
        chrome.bookmarks.move(@grabbed.id, destination, onMove)

    $(document).mouseup(onMouseUp)

    onPaste = =>
      destination = {parentId: @current_node}
      items = (item for item in @cut_items)
      @_emptyCutItems()
      @count = 0
      @number = items.length
      for item in items
        onMove = =>
          @count++
          if @count is @number
            @_refresh()
        chrome.bookmarks.move(item.node.id, destination, onMove)

    $('#cut-box div.ok').click(onPaste)

    onCancelMove = =>
      @_emptyCutItems()

    $('#cut-box div.cancel').click(onCancelMove)

    onKeyDown = (event) =>
      if event.ctrlKey and event.which is 86 # v
        onPaste()
    $(document).keydown(onKeyDown)

  _gotoNode: (id) ->
    if @storage.getFolderMode() is 'last'
      @storage.setDefaultFolder(id)
    @current_node = id
    @dumpChildren()

  _refresh: ->
    @_gotoNode(@current_node)

  _updateDefaultDisplay: ->
    onget = (node) ->
      title = node[0].title
      if not title
        title = "root"
      $('#current-default').text(title)

    chrome.bookmarks.get(@storage.getDefaultFolder(), onget)

  _toggleEditMode: ->
    @edit_mode = not @edit_mode
    if @edit_mode
      $('.small-btns').show()
      $('#edit-buttons').show()
    else
      $('.small-btns').hide()
      $('#edit-buttons').hide()

  _hideEditBoxes: ->
    $('#grey-out').hide()
    $('#edit-folder').hide()
    $('#edit-item').hide()
    @edit_id = null

  _openEditFolder: (name) ->
    $('#grey-out').show()
    $('#edit-folder').show()
    $('#input-folder-name').val(name)
    $('#input-folder-name').focus()

  _openEditItem: (name, url) ->
    $('#grey-out').show()
    $('#edit-item').show()
    $('#input-item-name').val(name)
    $('#input-item-name').focus()
    $('#input-item-url').val(url)

  _moveGrabbed: (x, y) ->
    @grabbed.element.css('left', x - @grabbed.pos.left - 145)
    @grabbed.element.css('top', y - @grabbed.pos.top + 5)

  _addCutItem: (node, label_text) ->
    for e in @cut_items
      if e.node is node
        return

    list = $('#cut-items')
    item = $('<li>')
    div = $('<div>')
    div.addClass("cut-item")
    div.attr('title', "Remove from list")
    div.text(label_text)

    item.append(div)
    list.append(item)

    onItemClick = =>
      @_removeCutItem(node)

    div.click(onItemClick)

    btn = '#' + node.id + ' div.cut-btn'
    $(btn).click(onItemClick)
    $(btn).attr('title', "Deselect")

    cut_item = {
      node: node,
      item: item
    }
    @cut_items.push(cut_item)
    $('#cut-box').show()
    # Add some padding to the bottom so you can still see everything
    $('html').css('padding-bottom', $('#cut-box').outerHeight())

  _removeCutItem: (node) ->
    index = -1
    for i in [0...@cut_items.length]
      if @cut_items[i].node is node
        index = i
        break

    if index isnt -1
      cut_item = @cut_items[index]
      cut_item.item.remove()
      @cut_items.splice(index, 1)

      if @cut_items.length is 0
        $('#cut-box').hide()
        $('html').css('padding-bottom', 0)

      $('#' + node.id).css('border-color', '')
      label_text = $('#' + node.id + ' span').text()

      btn = '#' + node.id + ' div.cut-btn'
      $(btn).click(@_onCut(node, label_text))
      $(btn).attr('title', "Move to new folder")

  _emptyCutItems: () ->
    nodes = (e.node for e in @cut_items)
    @_removeCutItem(node) for node in nodes

jQuery ->
  m = new Main()
  m.dumpChildren()