from django.shortcuts import render
from .models import Todo
from django.contrib.auth import get_user_model

from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_protect
from django.http import JsonResponse
import json
from .api import get_distractions


User = get_user_model()

@login_required
def index_view(request):
    todos = list()
    if request.method == 'POST':
        task = request.POST.get("task")
        priority = request.POST.get("priority")
        deadline = request.POST.get("deadline")
        
        # Convert deadline to proper format if provided
        deadline_value = None
        if deadline:
            from datetime import datetime
            try:
                deadline_value = datetime.strptime(deadline, "%Y-%m-%dT%H:%M")
            except ValueError:
                pass
        
        Todo.objects.create(task=task, priority=priority, deadline=deadline_value, user=request.user)
        distractions = get_distractions(task)
        for distraction in distractions:
            Todo.objects.create(user=request.user, priority="HIGH", task=distraction)

        return redirect('index')
    try:
        todos = Todo.objects.filter(user=request.user)
    except:
        pass
    
    from django.utils import timezone
    return render(request, 'index.html', context={'todos': todos, 'now': timezone.now()})

@login_required
def logout_view(request):
    logout(request)
    return redirect('login')

@login_required
def toggle_todo_completion(request, todo_id):
    if request.method == 'POST':
        try:
            todo = Todo.objects.get(id=todo_id, user=request.user)
            todo.completed = not todo.completed
            todo.save()
            return JsonResponse({
                'success': True, 
                'completed': todo.completed,
                'message': f'Todo {"completed" if todo.completed else "uncompleted"} successfully!'
            })
        except Todo.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Todo not found'})
    return JsonResponse({'success': False, 'message': 'Invalid request method'})

def remove_todo(request, todo_id):
    if request.method == 'POST':
        try:
            todo = Todo.objects.get(id=todo_id, user=request.user)
            todo.delete()
            pass
        except Todo.DoesNotExist:
            pass
    return redirect('index')

@csrf_protect
def register_view(request):
    if request.method == 'POST':
        if request.content_type == 'application/json':
            # Handle AJAX registration
            try:
                data = json.loads(request.body)
                name = data.get('name')
                email = data.get('email')
                password = data.get('password')
                confirm_password = data.get('confirm_password')
            except json.JSONDecodeError:
                return JsonResponse({'success': False, 'message': 'Invalid JSON data'})
        else:
            # Handle form registration
            name = request.POST.get('name')
            email = request.POST.get('email')
            password = request.POST.get('password')
            confirm_password = request.POST.get('confirm_password')
        
        # Validation
        if not all([name, email, password, confirm_password]):
            error_message = 'Please fill in all fields'
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'message': error_message})
            else:
                messages.error(request, error_message)
                return render(request, 'create.html')
        
        if password != confirm_password:
            error_message = 'Passwords do not match'
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'message': error_message})
            else:
                messages.error(request, error_message)
                return render(request, 'create.html')
        
        if User.objects.filter(email=email).exists():
            error_message = 'Email already exists'
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'message': error_message})
            else:
                messages.error(request, error_message)
                return render(request, 'create.html')
        
        if User.objects.filter(username=email).exists():
            error_message = 'User already exists'
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'message': error_message})
            else:
                messages.error(request, error_message)
                return render(request, 'login.html')
        
        # Create user
        try:
            user = User.objects.create_user(
                username=email,  # Use email as username
                email=email,
                password=password,
                first_name=name.split()[0] if name.split() else name,
                last_name=' '.join(name.split()[1:]) if len(name.split()) > 1 else ''
            )
            
            # Log in the user
            login(request, user)
            if request.content_type == 'application/json':
                return JsonResponse({'success': True, 'redirect_url': '/'})
            else:
                return redirect('index')
        except Exception as e:
            error_message = 'Error creating user'
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'message': error_message})
            else:
                messages.error(request, error_message)
                return render(request, 'create.html')
    return render(request, 'login.html')

@csrf_protect
def login_view(request):
    if request.method == 'POST':
        if request.content_type == 'application/json':
            # Handle AJAX login
            try:
                data = json.loads(request.body)
                email = data.get('email')
                password = data.get('password')
                remember_me = data.get('remember_me', False)
            except json.JSONDecodeError:
                return JsonResponse({'success': False, 'message': 'Invalid JSON data'})
        else:
            # Handle form login
            email = request.POST.get('email')
            password = request.POST.get('password')
            remember_me = request.POST.get('remember_me') == 'on'
        
        if email and password:
            # Try to find user by email (Django uses username by default)
            try:
                user_obj = User.objects.get(email=email)
                user = authenticate(request, username=user_obj.username, password=password)
            except User.DoesNotExist:
                user = None
            
            if user is not None:
                login(request, user)
                
                # Set session expiry based on remember me
                if not remember_me:
                    request.session.set_expiry(0)  # Session expires when browser closes
                else:
                    request.session.set_expiry(1209600)  # 2 weeks
                
                if request.content_type == 'application/json':
                    return JsonResponse({'success': True, 'redirect_url': '/'})
                else:
                    return redirect('index')
            else:
                error_message = 'Invalid email or password'
                if request.content_type == 'application/json':
                    return JsonResponse({'success': False, 'message': error_message})
                else:
                    messages.error(request, error_message)
        else:
            error_message = 'Please fill in all fields'
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'message': error_message})
            else:
                messages.error(request, error_message)
    
    return render(request, 'login.html')

@csrf_protect
def register_view(request):
    if request.method == 'POST':
        if request.content_type == 'application/json':
            # Handle AJAX registration
            try:
                data = json.loads(request.body)
                name = data.get('name')
                email = data.get('email')
                password = data.get('password')
                confirm_password = data.get('confirm_password')
            except json.JSONDecodeError:
                return JsonResponse({'success': False, 'message': 'Invalid JSON data'})
        else:
            # Handle form registration
            name = request.POST.get('name')
            email = request.POST.get('email')
            password = request.POST.get('password')
            confirm_password = request.POST.get('confirm_password')
        
        # Validation
        if not all([name, email, password, confirm_password]):
            error_message = 'Please fill in all fields'
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'message': error_message})
            else:
                messages.error(request, error_message)
                return render(request, 'create.html')
        
        if password != confirm_password:
            error_message = 'Passwords do not match'
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'message': error_message})
            else:
                messages.error(request, error_message)
                return render(request, 'create.html')
        
        if User.objects.filter(email=email).exists():
            error_message = 'Email already exists'
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'message': error_message})
            else:
                messages.error(request, error_message)
                return render(request, 'create.html')
        
        if User.objects.filter(username=email).exists():
            error_message = 'User already exists'
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'message': error_message})
            else:
                messages.error(request, error_message)
                return render(request, 'create.html')
        
        # Create user
        try:
            user = User.objects.create_user(
                username=email,  # Use email as username
                email=email,
                password=password,
                first_name=name.split()[0] if name.split() else name,
                last_name=' '.join(name.split()[1:]) if len(name.split()) > 1 else ''
            )
            
            # Log in the user
            login(request, user)
            
            if request.content_type == 'application/json':
                return JsonResponse({'success': True, 'redirect_url': '/'})
            else:
                messages.success(request, 'Account created successfully!')
                return redirect('index')
                
        except Exception as e:
            error_message = 'Error creating account'
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'message': error_message})
            else:
                messages.error(request, error_message)
    
    return render(request, 'create.html')
