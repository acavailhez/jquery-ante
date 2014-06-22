jQuery Ante (jquery-ante)
=============

jQuery Ante will bind events to execute *before* any bound jQuery event.

Demo
-------------

A quick example of preloading content before showing it as a modal:
http://acavailhez.github.io/jquery-ante/demo.html

Super quick example
-------------

```javascript
var $a = $('#link');
$a.click(function(){
	alert('executed after');
});
$a.ante('click',function(){
	alert('executed before');
});
```

In this example, clicking on the `#link` will show the "executed before" alert before showing the "executed after"

Quick example
-------------

The real power of jquery-ante comes when you associate it with asynchronous events (such as AJAX calls, or any jQuery Promise)

Imagine you have a button to display a modal, but the modal content is not yet in the DOM and needs to be fetched through an API call

```html
<a id="show-modal-button">Show the modal</a>
```

```javascript

//show the modal on click
$('#show-modal-button').on('click',function(){
	$('#modal').modal('show');
});

//before showing the modal, fetch the modal content with an api call
$('#show-modal-button').ante('click',function(){
	return $.ajax({
		url:'/modal-content',
		dataType:'html',
		success:function(html){
			$('body').append(html);
			//now the content of the modal is in the DOM and can be shown
		}
	});
});
```

When clicking the button, the ajax call will be made and the page will wait for the html to be added to the DOM before displaying the modal